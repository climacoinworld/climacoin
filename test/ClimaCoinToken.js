// test/ClimaCoinToken.js
// Load dependencies
const { expect } = require("chai");

// Start test block
describe("ClimaCoinToken (proxy)", function () {
  let climaCoinToken;
  let tokenOwner;

  beforeEach(async function () {
    let ClimaCoinToken = await ethers.getContractFactory("ClimaCoinToken");
    climaCoinToken = await upgrades.deployProxy(
      ClimaCoinToken,
      ["ClimaCoin Token", "CLC", 29000000000],
      { initializer: "initialize" }
    );
    [tokenOwner, _] = await ethers.getSigners();
  });

  // Test case
  it("initializes the contract with the correct values", async function () {
    expect(await climaCoinToken.name()).to.equal("ClimaCoin Token");
    expect(await climaCoinToken.symbol()).to.equal("CLC");
    expect((await climaCoinToken.totalSupply()).toString()).to.equal(
      "29000000000000000000000000000"
    );
    expect(
      (await climaCoinToken.balanceOf(tokenOwner.address)).toString()
    ).to.equal("29000000000000000000000000000");
  });
});
