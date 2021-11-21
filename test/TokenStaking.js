// test/TokenStaking.js
// Load dependencies
const { expect } = require("chai");
const { BN, expectRevert, time } = require("@openzeppelin/test-helpers");

const REWARD_PROVIDER_ROLE = web3.utils.keccak256("REWARD_PROVIDER_ROLE");
const DEFAULT_ADMIN_ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

function unpack(str) {
  let buf = Buffer.from(str);
  strBytes = "";
  for (var i = 0; i < buf.length; i++) strBytes += buf[i].toString(16);

  while (strBytes.length < 64) strBytes += "0";

  return "0x" + strBytes;
}

// Start test block
describe("TokenStaking (proxy)", function () {
  let tokenStaking;
  let token;

  beforeEach(async function () {
    [owner, beneficiary, _] = await ethers.getSigners();

    let TokenFactory = await ethers.getContractFactory("ClimaCoinToken");
    token = await upgrades.deployProxy(
      TokenFactory,
      ["ClimaCoin Token", "CLC", 29000000000],
      { initializer: "initialize" }
    );

    let TokenStakingFactory = await ethers.getContractFactory("TokenStaking");
    tokenStaking = await upgrades.deployProxy(
      TokenStakingFactory,
      [token.address],
      { initializer: "initialize" }
    );
  });

  // Test case
  describe("check basic init", () => {
    it("should set a staked token", async () => {
      expect((await tokenStaking.tokenContract()).toString()).to.be.equal(
        token.address
      );
    });

    it("has a totalStakedFunds", async () => {
      expect((await tokenStaking.totalStakedFunds()).toString()).to.equal("0");
    });

    it("has a paused", async () => {
      expect(await tokenStaking.paused()).to.equal(false);
    });

    it("has a REWARD_PROVIDER_ROLE", async () => {
      expect(await tokenStaking.REWARD_PROVIDER_ROLE()).to.be.equal(
        REWARD_PROVIDER_ROLE
      );
    });

    it("should set roles accordingly", async () => {
      expect(
        await tokenStaking.hasRole(DEFAULT_ADMIN_ROLE, owner.address)
      ).to.be.equal(true);

      expect(
        await tokenStaking.hasRole(REWARD_PROVIDER_ROLE, owner.address)
      ).to.be.equal(true);
    });

    describe("should define packages", () => {
      describe("Silver Package", () => {
        let package;

        before(async () => {
          package = await tokenStaking.packages(unpack("silver"));
        });

        it("has a name", async () => {
          expect(package._packageName).to.be.equal(unpack("silver"));
        });

        it("has a days period", () => {
          expect(package._daysLocked.toString()).to.equal("7");
        });

        it("has a days blocked", () => {
          expect(package._daysBlocked.toString()).to.equal("3");
        });

        it("has a percentage interest", () => {
          expect(package._packageInterest.toString()).to.equal("8");
        });
      });

      describe("Gold Package", () => {
        let package;

        before(async () => {
          package = await tokenStaking.packages(unpack("gold"));
        });

        it("has a name", async () => {
          expect(package._packageName).to.be.equal(unpack("gold"));
        });

        it("has a days period", () => {
          expect(package._daysLocked.toString()).to.equal("30");
        });

        it("has a days blocked", () => {
          expect(package._daysBlocked.toString()).to.equal("10");
        });

        it("has a percentage interest", () => {
          expect(package._packageInterest.toString()).to.equal("12");
        });
      });

      describe("Platinum Package", () => {
        let package;

        before(async () => {
          package = await tokenStaking.packages(unpack("platinum"));
        });

        it("has a name", async () => {
          expect(package._packageName).to.be.equal(unpack("platinum"));
        });

        it("has a days period", () => {
          expect(package._daysLocked.toString()).to.equal("60");
        });

        it("has a days blocked", () => {
          expect(package._daysBlocked.toString()).to.equal("20");
        });

        it("has a percentage interest", () => {
          expect(package._packageInterest.toString()).to.equal("15");
        });
      });
    });
  });
});
