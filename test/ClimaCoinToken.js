// test/ClimacoinToken.js
// Load dependencies
const { expect } = require("chai");

// Start test block
describe("ClimacoinToken", function () {
  let climacoinToken;
  let tokenOwner;

  beforeEach(async function () {
    let ClimacoinToken = await ethers.getContractFactory("ClimacoinToken");
    climacoinToken = await ClimacoinToken.deploy(
      "Climacoin",
      "CLC",
      29000000000
    );
    await climacoinToken.deployed();
    [tokenOwner, _] = await ethers.getSigners();
  });

  // Test case
  it("initializes the contract with the correct values", async function () {
    expect(await climacoinToken.name()).to.equal("Climacoin");
    expect(await climacoinToken.symbol()).to.equal("CLC");
    expect((await climacoinToken.totalSupply()).toString()).to.equal(
      "29000000000000000000000000000"
    );
    expect(
      (await climacoinToken.balanceOf(tokenOwner.address)).toString()
    ).to.equal("29000000000000000000000000000");
  });
});
