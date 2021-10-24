// test/TokenVesting.js
// Load dependencies
const { expect } = require("chai");
const { BN, time } = require("@openzeppelin/test-helpers");

// Start test block
describe("TokenVesting (proxy)", function () {
  beforeEach(async function () {
    [owner, beneficiary, revoker, _] = await ethers.getSigners();

    let TokenFactory = await ethers.getContractFactory("ClimaCoinToken");
    token = await upgrades.deployProxy(
      TokenFactory,
      ["ClimaCoin Token", "CLC", 29000000000],
      { initializer: "initialize" }
    );

    let TokenVestingFactory = await ethers.getContractFactory("TokenVesting");
    let startTime = (await time.latest()).add(time.duration.seconds(100)); // Start after 100 seconds
    tokenVesting = await upgrades.deployProxy(
      TokenVestingFactory,
      [
        token.address,
        beneficiary.address,
        startTime.toString(),
        time.duration.weeks("12").toString(), // Releases delay
        "8",
        false,
        revoker.address,
      ],
      { initializer: "initialize" }
    );

    await token.transfer(tokenVesting.address, ethers.utils.parseEther("100"));
  });

  // Test case
  it("TODO", async function () {});
});
