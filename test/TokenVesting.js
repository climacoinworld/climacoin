// test/TokenVesting.js
// Load dependencies
const { expect } = require("chai");
const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");

// Start test block
describe("TokenVesting", function () {
  beforeEach(async function () {
    [owner, beneficiary, _] = await ethers.getSigners();

    let TokenFactory = await ethers.getContractFactory("ClimacoinToken");
    this.token = await TokenFactory.deploy("Climacoin", "CLC", 29000000000);
    await this.token.deployed();

    let TokenVestingFactory = await ethers.getContractFactory("TokenVesting");
    this.cliff = time.duration.seconds(100); // Start after 100 seconds
    this.releasesCount = 4;
    this.duration = time.duration.weeks("10");
    this.tokenVesting = await TokenVestingFactory.deploy(
      this.token.address,
      beneficiary.address,
      this.cliff.toString(),
      this.duration.toString(),
      this.releasesCount.toString()
    );
    await this.tokenVesting.deployed();

    await this.token.transfer(
      this.tokenVesting.address,
      ethers.utils.parseEther("100")
    );
  });

  // Test case
  it("test getters", async function () {
    let vestingBeneficiary = await this.tokenVesting.beneficiary();
    expect(vestingBeneficiary).to.equal(beneficiary.address);

    let vestingStart = await this.tokenVesting.start();
    let vestingFinish = await this.tokenVesting.finish();
    expect(vestingFinish.toString()).to.equal(
      new BN(vestingStart.toNumber())
        .add(this.duration.mul(new BN(this.releasesCount)))
        .toString()
    );

    let vestingCliff = await this.tokenVesting.cliff();
    expect(vestingCliff.toString()).to.equal(this.cliff.toString());

    let vestingDuration = await this.tokenVesting.duration();
    expect(vestingDuration.toString()).to.equal(this.duration.toString());

    let vestingReleased = await this.tokenVesting.released();
    expect(vestingReleased.toString()).to.equal("0");

    let vestingReleasesCount = await this.tokenVesting.releasesCount();
    expect(vestingReleasesCount.toString()).to.equal(
      this.releasesCount.toString()
    );

    let vestingOwner = await this.tokenVesting.owner();
    expect(vestingOwner).to.equal(owner.address);

    let vestingAvailableTokens = await this.tokenVesting.getAvailableTokens();
    expect(vestingAvailableTokens.toString()).to.equal("0");
  });

  // Test case
  it("test release", async function () {
    let vestingReleased = await this.tokenVesting.released();
    expect(vestingReleased.toString()).to.equal(
      ethers.utils.parseEther("0").toString()
    );

    let availableTokens = await this.tokenVesting.getAvailableTokens();
    expect(availableTokens.toString()).to.equal(
      ethers.utils.parseEther("0").toString()
    );

    let beneficiaryBalance = await this.token.balanceOf(beneficiary.address);
    expect(beneficiaryBalance.toString()).to.equal(
      ethers.utils.parseEther("0").toString()
    );

    let vestingBalance = await this.token.balanceOf(this.tokenVesting.address);
    expect(vestingBalance.toString()).to.equal(
      ethers.utils.parseEther("100").toString()
    );

    await expectRevert(
      this.tokenVesting.release(),
      "release: unauthorized sender!"
    );

    await expectRevert(
      this.tokenVesting.connect(beneficiary).release(),
      "release: No tokens are due!"
    );

    await time.increase(parseInt(time.duration.weeks("10")));
    await time.increase(parseInt(time.duration.minutes("10")));

    availableTokens = await this.tokenVesting.getAvailableTokens();
    expect(availableTokens.toString()).to.equal(
      ethers.utils.parseEther("25").toString()
    );

    await this.tokenVesting.connect(beneficiary).release();

    vestingReleased = await this.tokenVesting.released();
    expect(vestingReleased.toString()).to.equal(
      ethers.utils.parseEther("25").toString()
    );

    beneficiaryBalance = await this.token.balanceOf(beneficiary.address);
    expect(beneficiaryBalance.toString()).to.equal(
      ethers.utils.parseEther("25").toString()
    );

    vestingBalance = await this.token.balanceOf(this.tokenVesting.address);
    expect(vestingBalance.toString()).to.equal(
      ethers.utils.parseEther("75").toString()
    );

    await time.increase(parseInt(time.duration.weeks("30")));

    availableTokens = await this.tokenVesting.getAvailableTokens();
    expect(availableTokens.toString()).to.equal(
      ethers.utils.parseEther("75").toString()
    );

    await this.tokenVesting.connect(beneficiary).release();

    vestingReleased = await this.tokenVesting.released();
    expect(vestingReleased.toString()).to.equal(
      ethers.utils.parseEther("100").toString()
    );

    beneficiaryBalance = await this.token.balanceOf(beneficiary.address);
    expect(beneficiaryBalance.toString()).to.equal(
      ethers.utils.parseEther("100").toString()
    );

    vestingBalance = await this.token.balanceOf(this.tokenVesting.address);
    expect(vestingBalance.toString()).to.equal(
      ethers.utils.parseEther("0").toString()
    );
  });

  // Test case
  it("test adding more tokens to the contract during vesting", async function () {
    await time.increase(parseInt(time.duration.weeks("10")));
    await time.increase(parseInt(time.duration.minutes("10")));
    await this.tokenVesting.connect(beneficiary).release();

    let beneficiaryBalance = await this.token.balanceOf(beneficiary.address);
    expect(beneficiaryBalance.toString()).to.equal(
      ethers.utils.parseEther("25").toString()
    );

    let vestingBalance = await this.token.balanceOf(this.tokenVesting.address);
    expect(vestingBalance.toString()).to.equal(
      ethers.utils.parseEther("75").toString()
    );

    await this.token.transfer(
      this.tokenVesting.address,
      ethers.utils.parseEther("100")
    );

    vestingBalance = await this.token.balanceOf(this.tokenVesting.address);
    expect(vestingBalance.toString()).to.equal(
      ethers.utils.parseEther("175").toString()
    );

    await time.increase(parseInt(time.duration.weeks("20")));
    await this.tokenVesting.connect(beneficiary).release();

    beneficiaryBalance = await this.token.balanceOf(beneficiary.address);
    expect(beneficiaryBalance.toString()).to.equal(
      ethers.utils.parseEther("150").toString()
    );

    vestingBalance = await this.token.balanceOf(this.tokenVesting.address);
    expect(vestingBalance.toString()).to.equal(
      ethers.utils.parseEther("50").toString()
    );
  });

  // Test case
  it("testing the entire workflow for token vesting", async function () {
    let beneficiaryBalance = await this.token.balanceOf(beneficiary.address);
    expect(beneficiaryBalance.toString()).to.equal(
      ethers.utils.parseEther("0").toString()
    );

    let vestingBalance = await this.token.balanceOf(this.tokenVesting.address);
    expect(vestingBalance.toString()).to.equal(
      ethers.utils.parseEther("100").toString()
    );

    // Try to claim should be failed
    await expectRevert(
      this.tokenVesting.connect(beneficiary).release(),
      "release: No tokens are due!"
    );

    // Increase to first release
    await time.increase(parseInt(time.duration.weeks("11")));
    await this.tokenVesting.connect(beneficiary).release();

    beneficiaryBalance = await this.token.balanceOf(beneficiary.address);
    expect(beneficiaryBalance.toString()).to.equal(
      ethers.utils.parseEther("25").toString()
    );

    vestingBalance = await this.token.balanceOf(this.tokenVesting.address);
    expect(vestingBalance.toString()).to.equal(
      ethers.utils.parseEther("75").toString()
    );

    // Increase to second release
    await time.increase(parseInt(time.duration.weeks("10")));

    beneficiaryBalance = await this.token.balanceOf(beneficiary.address);
    expect(beneficiaryBalance.toString()).to.equal(
      ethers.utils.parseEther("25").toString()
    );

    // Release any tokens left
    await this.tokenVesting.connect(beneficiary).release();
    beneficiaryBalance = await this.token.balanceOf(beneficiary.address);
    expect(beneficiaryBalance.toString()).to.equal(
      ethers.utils.parseEther("50").toString()
    );

    vestingBalance = await this.token.balanceOf(this.tokenVesting.address);
    expect(vestingBalance.toString()).to.equal(
      ethers.utils.parseEther("50").toString()
    );
  });
});

// Start test block
describe("TokenVesting - odd token divison", function () {
  beforeEach(async function () {
    [owner, beneficiary, _] = await ethers.getSigners();

    let TokenFactory = await ethers.getContractFactory("ClimacoinToken");
    this.token = await TokenFactory.deploy("Climacoin", "CLC", 29000000000);
    await this.token.deployed();

    let TokenVestingFactory = await ethers.getContractFactory("TokenVesting");
    this.cliff = time.duration.seconds(100); // Start after 100 seconds
    this.releasesCount = 3;
    this.duration = time.duration.weeks("10");
    this.tokenVesting = await TokenVestingFactory.deploy(
      this.token.address,
      beneficiary.address,
      this.cliff.toString(),
      this.duration.toString(),
      this.releasesCount.toString()
    );
    await this.tokenVesting.deployed();

    await this.token.transfer(
      this.tokenVesting.address,
      ethers.utils.parseEther("100")
    );
  });

  // Test case
  it("test odd token division", async function () {
    let beneficiaryBalance = await this.token.balanceOf(beneficiary.address);
    expect(beneficiaryBalance.toString()).to.equal(
      ethers.utils.parseEther("0").toString()
    );

    let vestingBalance = await this.token.balanceOf(this.tokenVesting.address);
    expect(vestingBalance.toString()).to.equal(
      ethers.utils.parseEther("100").toString()
    );

    await time.increase(parseInt(time.duration.weeks("10")));
    await time.increase(parseInt(time.duration.minutes("10")));
    await this.tokenVesting.connect(beneficiary).release();

    beneficiaryBalance = await this.token.balanceOf(beneficiary.address);
    expect(beneficiaryBalance.toString()).to.equal("33333333333333333333");

    vestingBalance = await this.token.balanceOf(this.tokenVesting.address);
    expect(vestingBalance.toString()).to.equal("66666666666666666667");

    await this.token.transfer(
      this.tokenVesting.address,
      ethers.utils.parseEther("10")
    );

    vestingBalance = await this.token.balanceOf(this.tokenVesting.address);
    expect(vestingBalance.toString()).to.equal("76666666666666666667");

    await time.increase(parseInt(time.duration.weeks("10")));
    await this.tokenVesting.connect(beneficiary).release();

    beneficiaryBalance = await this.token.balanceOf(beneficiary.address);
    expect(beneficiaryBalance.toString()).to.equal("73333333333333333332");

    vestingBalance = await this.token.balanceOf(this.tokenVesting.address);
    expect(vestingBalance.toString()).to.equal("36666666666666666668");

    let ownerBalance = await this.token.balanceOf(owner.address);
    expect(ownerBalance.toString()).to.equal("28999999890000000000000000000");
  });
});
