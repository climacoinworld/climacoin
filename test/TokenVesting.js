// test/TokenVesting.js
// Load dependencies
const { expect } = require("chai");
const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");

// Start test block
describe("TokenVesting (proxy)", function () {
  let owner, beneficiary

  beforeEach(async function () {
    [owner, beneficiary, revoker, _] = await ethers.getSigners();

    let TokenFactory = await ethers.getContractFactory("ClimaCoinToken");
    this.token = await upgrades.deployProxy(
      TokenFactory,
      ["ClimaCoin Token", "CLC", 29000000000],
      { initializer: "initialize" }
    );

    let TokenVestingFactory = await ethers.getContractFactory("TokenVesting");
    let startTime = (await time.latest()).add(time.duration.seconds(100)); // Start after 100 seconds
    this.tokenVesting = await upgrades.deployProxy(
      TokenVestingFactory,
      [
        this.token.address,
        beneficiary.address,
        startTime.toString(),
        time.duration.weeks("10").toString(), // Releases delay
        "4",
        true,
        revoker.address,
      ],
      { initializer: "initialize" }
    );

    await this.token.transfer(this.tokenVesting.address, ethers.utils.parseEther("100"));
  });

  // Test case
  it("testing the entire workflow for token vesting", async function () {
    let beneficiaryBalance = await this.token.balanceOf(beneficiary.address)
    expect(beneficiaryBalance.toString()).to.equal(ethers.utils.parseEther("0").toString());

    let vestingBalance = await this.token.balanceOf(this.tokenVesting.address)
    expect(vestingBalance.toString()).to.equal(ethers.utils.parseEther("100").toString())

    let revokerAddr = await this.tokenVesting.revoker()
    expect(revokerAddr).to.equal(revoker.address)

    // Try to claim should be failed
    await expectRevert(this.tokenVesting.release(), "release: No tokens are due!")
    await expectRevert(this.tokenVesting.revoke(revokerAddr), "revoke: unauthorized sender!")

    // Increase to first release
    await time.increase(parseInt(time.duration.weeks('11')))
    await this.tokenVesting.connect(beneficiary).release()

    beneficiaryBalance = await this.token.balanceOf(beneficiary.address)
    expect(beneficiaryBalance.toString()).to.equal(ethers.utils.parseEther("25").toString())

    vestingBalance = await this.token.balanceOf(this.tokenVesting.address)
    expect(vestingBalance.toString()).to.equal(ethers.utils.parseEther("75").toString())

    // Increase to second release and revoke
    await time.increase(parseInt(time.duration.weeks('10')))
    await this.tokenVesting.connect(revoker).revoke(beneficiary.address)

    beneficiaryBalance = await this.token.balanceOf(beneficiary.address)
    expect(beneficiaryBalance.toString()).to.equal(ethers.utils.parseEther("75").toString())

    vestingBalance = await this.token.balanceOf(this.tokenVesting.address)
    expect(vestingBalance.toString()).to.equal(ethers.utils.parseEther("25").toString())
  
    // Release any tokens left
        await this.tokenVesting.connect(beneficiary).release()
    beneficiaryBalance = await this.token.balanceOf(beneficiary.address)
    expect(beneficiaryBalance.toString()).to.equal(ethers.utils.parseEther("100").toString())

    vestingBalance = await this.token.balanceOf(this.tokenVesting.address)
    expect(vestingBalance.toString()).to.equal(ethers.utils.parseEther("0").toString())
  });
});
