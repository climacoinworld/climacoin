// test/ClimaCoinToken.proxy.js
// Load dependencies
const { expect } = require("chai");

let ClimaCoinToken;
let climaCoinToken;

// Start test block
describe("ClimaCoinToken (proxy)", function () {
  beforeEach(async function () {
    ClimaCoinToken = await ethers.getContractFactory("ClimaCoinToken");
    climaCoinToken = await upgrades.deployProxy(
      ClimaCoinToken,
      ["ClimaCoin Token", "CLC", 29000000000],
      { initializer: "initialize" }
    );
  });

  // Test case
  it("initializes the contract with the correct values", async function () {
    expect(await climaCoinToken.name()).to.equal("ClimaCoin Token");
    expect(await climaCoinToken.symbol()).to.equal("CLC");
    expect((await climaCoinToken.totalSupply()).toString()).to.equal(
      "29000000000"
    );
  });
});
