// test/TokenStaking.js
// Load dependencies
const { use, expect } = require("chai");

const { solidity } = require("ethereum-waffle");
use(solidity);
use(require("chai-datetime"));

const { expectRevert, time } = require("@openzeppelin/test-helpers");

const REWARD_PROVIDER_ROLE = web3.utils.keccak256("REWARD_PROVIDER_ROLE");
const DEFAULT_ADMIN_ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

const SILVER = unpack("silver");
const GOLD = unpack("gold");
const PLATINUM = unpack("platinum");

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
    [owner, user1, user2, user3, _] = await ethers.getSigners();

    let TokenFactory = await ethers.getContractFactory("ClimaCoinToken");
    token = await upgrades.deployProxy(
      TokenFactory,
      ["ClimaCoin Token", "CLC", 29000000000],
      { initializer: "initialize" }
    );

    await token.transfer(user1.address, ethers.utils.parseEther("2000000"));
    await token.transfer(user2.address, ethers.utils.parseEther("2000000"));
    await token.transfer(user3.address, ethers.utils.parseEther("2000000"));

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
      expect(await tokenStaking.tokenContract()).to.equal(token.address);
    });

    it("has a totalStakedFunds", async () => {
      expect(await tokenStaking.totalStakedFunds()).to.equal("0");
    });

    it("has a paused", async () => {
      expect(await tokenStaking.paused()).to.equal(false);
    });

    it("has a REWARD_PROVIDER_ROLE", async () => {
      expect(await tokenStaking.REWARD_PROVIDER_ROLE()).to.equal(
        REWARD_PROVIDER_ROLE
      );
    });

    it("should set roles accordingly", async () => {
      expect(
        await tokenStaking.hasRole(DEFAULT_ADMIN_ROLE, owner.address)
      ).to.equal(true);

      expect(
        await tokenStaking.hasRole(REWARD_PROVIDER_ROLE, owner.address)
      ).to.equal(true);
    });

    describe("should define packages", () => {
      describe("Silver Package", () => {
        let package;

        before(async () => {
          package = await tokenStaking.packages(SILVER);
        });

        it("has a name", async () => {
          expect(package._packageName).to.equal(SILVER);
        });

        it("has a days period", () => {
          expect(package._daysLocked).to.equal("30");
        });

        it("has a days blocked", () => {
          expect(package._daysBlocked).to.equal("15");
        });

        it("has a percentage interest", () => {
          expect(package._packageInterest).to.equal("8");
        });
      });

      describe("Gold Package", () => {
        let package;

        before(async () => {
          package = await tokenStaking.packages(GOLD);
        });

        it("has a name", async () => {
          expect(package._packageName).to.equal(GOLD);
        });

        it("has a days period", () => {
          expect(package._daysLocked).to.equal("60");
        });

        it("has a days blocked", () => {
          expect(package._daysBlocked).to.equal("30");
        });

        it("has a percentage interest", () => {
          expect(package._packageInterest).to.equal("18");
        });
      });

      describe("Platinum Package", () => {
        let package;

        before(async () => {
          package = await tokenStaking.packages(PLATINUM);
        });

        it("has a name", async () => {
          expect(package._packageName).to.equal(PLATINUM);
        });

        it("has a days period", () => {
          expect(package._daysLocked).to.equal("90");
        });

        it("has a days blocked", () => {
          expect(package._daysBlocked).to.equal("45");
        });

        it("has a percentage interest", () => {
          expect(package._packageInterest).to.equal("30");
        });
      });
    });
  });

  describe("Functions", () => {
    describe("stakeTokens", () => {
      beforeEach(async () => {
        await token
          .connect(user1)
          .approve(tokenStaking.address, ethers.utils.parseEther("200"));
        await token
          .connect(user2)
          .approve(tokenStaking.address, ethers.utils.parseEther("200"));
      });

      it("should revert staking on pause", async () => {
        await tokenStaking
          .connect(user1)
          .stakeTokens(ethers.utils.parseEther("80"), GOLD);
        await tokenStaking.pauseStaking();

        await expectRevert(
          tokenStaking
            .connect(user1)
            .stakeTokens(ethers.utils.parseEther("80"), GOLD),
          "The staking is paused."
        );
      });

      it("should revet if _amount !> 0", async () => {
        await expectRevert(
          tokenStaking.connect(user1).stakeTokens(0, SILVER),
          "You need to stake a positive number of tokens."
        );
      });

      it("should revert if no staking package", async () => {
        await expectRevert(
          tokenStaking
            .connect(user1)
            .stakeTokens(ethers.utils.parseEther("10"), REWARD_PROVIDER_ROLE),
          "There is no staking package with the declared name or the staking package is poorly formated."
        );
      });

      it("should add to totalStakedBalance", async () => {
        expect(await tokenStaking.totalStakedBalance(user1.address)).to.equal(
          "0"
        );
        await tokenStaking
          .connect(user1)
          .stakeTokens(ethers.utils.parseEther("10"), SILVER);

        expect(await tokenStaking.totalStakedBalance(user1.address)).to.equal(
          ethers.utils.parseEther("10")
        );

        await tokenStaking
          .connect(user1)
          .stakeTokens(ethers.utils.parseEther("5"), GOLD);
        await tokenStaking
          .connect(user1)
          .stakeTokens(ethers.utils.parseEther("15"), PLATINUM);
        await tokenStaking
          .connect(user2)
          .stakeTokens(ethers.utils.parseEther("50"), GOLD);
        expect(await tokenStaking.totalStakedBalance(user1.address)).to.equal(
          ethers.utils.parseEther("30")
        );
      });

      it("should add to stakes", async () => {
        let timestamp = Math.floor(Date.now() / 1000);

        await tokenStaking
          .connect(user1)
          .stakeTokens(ethers.utils.parseEther("10"), SILVER);
        let stake = await tokenStaking.stakes(user1.address, 0);
        expect(stake._amount).to.equal(ethers.utils.parseEther("10"));
        expect(new Date(parseInt(stake._timestamp))).to.afterOrEqualDate(
          new Date(timestamp)
        );
        expect(stake._packageName).to.equal(SILVER);
        expect(stake._withdrawnTimestamp).to.equal("0");

        await tokenStaking
          .connect(user1)
          .stakeTokens(ethers.utils.parseEther("20"), PLATINUM);
        stake = await tokenStaking.stakes(user1.address, 1);
        expect(stake._amount).to.equal(ethers.utils.parseEther("20"));
        expect(new Date(parseInt(stake._timestamp))).to.afterOrEqualDate(
          new Date(timestamp)
        );
        expect(stake._packageName).to.equal(PLATINUM);
        expect(stake._withdrawnTimestamp).to.equal("0");
      });

      it("should update hasStaked", async () => {
        expect(await tokenStaking.hasStaked(user1.address)).to.equal(false);
        await tokenStaking
          .connect(user1)
          .stakeTokens(ethers.utils.parseEther("10"), SILVER);
        expect(await tokenStaking.hasStaked(user1.address)).to.equal(true);
      });

      it("should transfer token", async () => {
        expect(await token.balanceOf(tokenStaking.address)).to.equal("0");
        expect(await token.balanceOf(user1.address)).to.equal(
          ethers.utils.parseEther("2000000")
        );
        await tokenStaking
          .connect(user1)
          .stakeTokens(ethers.utils.parseEther("100"), SILVER);

        expect(await token.balanceOf(tokenStaking.address)).to.equal(
          ethers.utils.parseEther("100")
        );
        expect(await token.balanceOf(user1.address)).to.equal(
          ethers.utils.parseEther("1999900")
        );
      });

      it("should catch StakeAdded event", async () => {
        await expect(
          tokenStaking
            .connect(user1)
            .stakeTokens(ethers.utils.parseEther("100"), SILVER)
        )
          .to.emit(tokenStaking, "StakeAdded")
          .withArgs(user1.address, SILVER, ethers.utils.parseEther("100"), "0");
      });
    });
  });

  describe("checkStakeReward", () => {
    beforeEach(async () => {
      await token
        .connect(user1)
        .approve(tokenStaking.address, ethers.utils.parseEther("200"));
      await token
        .connect(user2)
        .approve(tokenStaking.address, ethers.utils.parseEther("200"));

      await token
        .connect(owner)
        .approve(tokenStaking.address, ethers.utils.parseEther("2000000"));
      await tokenStaking
        .connect(owner)
        .addStakedTokenReward(ethers.utils.parseEther("100"));
    });

    it("check stake reward for native token", async () => {
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);
      expect(
        (await tokenStaking.checkStakeReward(user1.address, 0)).yieldReward
      ).to.equal("0");
    });

    it("if it was unstaked, return reward for staked period", async () => {
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);
      await time.increase(time.duration.days(35));
      await tokenStaking.connect(user1).unstakeTokens(0);

      expect(
        (await tokenStaking.checkStakeReward(user1.address, 0)).yieldReward
      ).to.equal(ethers.utils.parseEther("4"));
      await time.increase(time.duration.days(35));
      expect(
        (await tokenStaking.checkStakeReward(user1.address, 0)).yieldReward
      ).to.equal(ethers.utils.parseEther("4"));
    });

    it("should calculate reward correctly", async () => {
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("20"), SILVER);
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("10"), GOLD);
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("40"), PLATINUM);

      await time.increase(time.duration.days(29));
      expect(
        (await tokenStaking.checkStakeReward(user1.address, 0)).yieldReward
      ).to.equal("0");
      await time.increase(time.duration.days(1));
      expect(
        (await tokenStaking.checkStakeReward(user1.address, 0)).yieldReward
      ).to.equal(ethers.utils.parseEther("4"));
      await time.increase(time.duration.days(30));
      expect(
        (await tokenStaking.checkStakeReward(user1.address, 0)).yieldReward
      ).to.equal(ethers.utils.parseEther("8.32"));
      await time.increase(time.duration.days(90));
      expect(
        (await tokenStaking.checkStakeReward(user1.address, 0)).yieldReward
      ).to.closeTo(
        ethers.utils.parseEther("23.4664"),
        ethers.utils.parseEther("0.001")
      );

      expect(
        (await tokenStaking.checkStakeReward(user1.address, 1)).yieldReward
      ).to.closeTo(
        ethers.utils.parseEther("9.386"),
        ethers.utils.parseEther("0.001")
      );

      expect(
        (await tokenStaking.checkStakeReward(user1.address, 2)).yieldReward
      ).to.closeTo(
        ethers.utils.parseEther("3.924"),
        ethers.utils.parseEther("0.0001")
      );

      expect(
        (await tokenStaking.checkStakeReward(user1.address, 3)).yieldReward
      ).to.closeTo(
        ethers.utils.parseEther("12"),
        ethers.utils.parseEther("0.0001")
      );
    });

    it("if it was unstaked return staked period", async () => {
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);
      await time.increase(time.duration.days(35));
      await tokenStaking.connect(user1).unstakeTokens(0);

      expect(
        (await tokenStaking.checkStakeReward(user1.address, 0)).timeDiff
      ).to.equal("35");
      await time.increase(time.duration.days(45));
      expect(
        (await tokenStaking.checkStakeReward(user1.address, 0)).timeDiff
      ).to.equal("35");
    });

    it("should calculate timeDiff correctly", async () => {
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);
      await time.increase(time.duration.days(33));

      expect(
        (await tokenStaking.checkStakeReward(user1.address, 0)).timeDiff
      ).to.equal("33");
      await time.increase(time.duration.days(28));
      expect(
        (await tokenStaking.checkStakeReward(user1.address, 0)).timeDiff
      ).to.equal("61");
    });
  });

  describe("unstakeTokens", () => {
    beforeEach(async () => {
      await token
        .connect(user1)
        .approve(tokenStaking.address, ethers.utils.parseEther("20000"));
      await token
        .connect(user2)
        .approve(tokenStaking.address, ethers.utils.parseEther("20000"));

      await token.approve(
        tokenStaking.address,
        ethers.utils.parseEther("2000000")
      );
      await tokenStaking.addStakedTokenReward(ethers.utils.parseEther("100"));
    });

    it("should revert if stake not defined", async () => {
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);

      await expectRevert(
        tokenStaking.connect(user1).unstakeTokens(1),
        "The stake you are searching for is not defined"
      );

      await time.increase(time.duration.days(45));

      await tokenStaking.connect(user1).unstakeTokens(0);
    });

    it("should revert if stake already withdrawn ", async () => {
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);
      await time.increase(time.duration.days(45));

      await tokenStaking.connect(user1).unstakeTokens(0);

      await expectRevert(
        tokenStaking.connect(user1).unstakeTokens(0),
        "The stake is already withdrawn."
      );
    });

    it("should decrease total balance", async () => {
      expect(await tokenStaking.totalStakedFunds()).to.equal("0");
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("60"), PLATINUM);
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);
      await time.increase(time.duration.days(100));

      expect(await tokenStaking.totalStakedFunds()).to.equal(
        ethers.utils.parseEther("160")
      );
      await tokenStaking.connect(user1).unstakeTokens(0);
      expect(await tokenStaking.totalStakedFunds()).to.equal(
        ethers.utils.parseEther("110")
      );

      await tokenStaking.connect(user1).unstakeTokens(1);
      expect(await tokenStaking.totalStakedFunds()).to.equal(
        ethers.utils.parseEther("50")
      );

      await tokenStaking.connect(user1).unstakeTokens(2);
      expect(await tokenStaking.totalStakedFunds()).to.equal(
        ethers.utils.parseEther("0")
      );
    });

    it("should decrease user total staked balance", async () => {
      expect(await tokenStaking.totalStakedBalance(user1.address)).to.equal(
        "0"
      );

      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("60"), PLATINUM);
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);
      await time.increase(time.duration.days(100));

      expect(await tokenStaking.totalStakedBalance(user1.address)).to.equal(
        ethers.utils.parseEther("160")
      );

      await tokenStaking.connect(user1).unstakeTokens(0);
      expect(await tokenStaking.totalStakedBalance(user1.address)).to.equal(
        ethers.utils.parseEther("110")
      );

      await tokenStaking.connect(user1).unstakeTokens(1);
      expect(await tokenStaking.totalStakedBalance(user1.address)).to.equal(
        ethers.utils.parseEther("50")
      );

      await tokenStaking.connect(user1).unstakeTokens(2);
      expect(await tokenStaking.totalStakedBalance(user1.address)).to.equal(
        ethers.utils.parseEther("0")
      );
    });

    it("should close the staking package(set _withdrawnTimestamp)", async () => {
      let stake;
      let timestamp = new Date(Math.floor(Date.now() / 1000));

      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);
      stake = await tokenStaking.stakes(user1.address, 0);
      await time.increase(time.duration.days(31));
      expect(stake._withdrawnTimestamp).to.equal("0");
      await tokenStaking.connect(user1).unstakeTokens(0);
      stake = await tokenStaking.stakes(user1.address, 0);
      expect(new Date(parseInt(stake._withdrawnTimestamp))).to.afterOrEqualDate(
        timestamp
      );

      await tokenStaking
        .connect(user2)
        .stakeTokens(ethers.utils.parseEther("30"), GOLD);
      stake = await tokenStaking.stakes(user2.address, 0);
      await time.increase(time.duration.days(61));
      expect(stake._withdrawnTimestamp).to.equal("0");
      await tokenStaking.connect(user2).unstakeTokens(0);
      stake = await tokenStaking.stakes(user2.address, 0);
      expect(new Date(parseInt(stake._withdrawnTimestamp))).to.afterOrEqualDate(
        timestamp
      );

      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("60"), PLATINUM);
      stake = await tokenStaking.stakes(user1.address, 1);
      await time.increase(time.duration.days(100));
      expect(stake._withdrawnTimestamp).to.equal("0");
      await tokenStaking.connect(user1).unstakeTokens(1);
      stake = await tokenStaking.stakes(user1.address, 1);
      expect(new Date(parseInt(stake._withdrawnTimestamp))).to.afterOrEqualDate(
        timestamp
      );

      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);
      stake = await tokenStaking.stakes(user1.address, 2);
      await time.increase(time.duration.days(31));
      expect(stake._withdrawnTimestamp).to.equal("0");
      await tokenStaking.connect(user1).unstakeTokens(2);
      stake = await tokenStaking.stakes(user1.address, 2);
      expect(new Date(parseInt(stake._withdrawnTimestamp))).to.afterOrEqualDate(
        timestamp
      );
    });

    describe("reward in ClimaCoin token", () => {
      it("should revert if not enough liquidity", async () => {
        await tokenStaking
          .connect(user1)
          .stakeTokens(ethers.utils.parseEther("5000"), SILVER);
        await time.increase(time.duration.days(31));

        await expectRevert(
          tokenStaking.connect(user1).unstakeTokens(0),
          "Token creators did not place enough liquidity in the contract for your reward to be paid"
        );
      });

      it("should revert if try to unstake sooner than the blocked time", async () => {
        await tokenStaking
          .connect(user1)
          .stakeTokens(ethers.utils.parseEther("50"), SILVER);
        await time.increase(time.duration.days(6));

        await expectRevert(
          tokenStaking.connect(user1).unstakeTokens(0),
          "Cannot unstake sooner than the blocked time."
        );

        await time.increase(time.duration.days(10));
        await tokenStaking.connect(user1).unstakeTokens(0);
      });

      it("should decrease reward pool", async () => {
        // reward pool 100, lets decrease on 80
        await tokenStaking
          .connect(user1)
          .stakeTokens(ethers.utils.parseEther("1000"), SILVER);
        await time.increase(time.duration.days(31));
        await tokenStaking.connect(user1).unstakeTokens(0);
        // now reward pool should be 20, lets try to get 40 tokens as reward, should fail

        await tokenStaking
          .connect(user1)
          .stakeTokens(ethers.utils.parseEther("500"), SILVER);
        await time.increase(time.duration.days(31));
        await expectRevert(
          tokenStaking.connect(user1).unstakeTokens(1),
          "Token creators did not place enough liquidity in the contract for your reward to be paid"
        );
      });

      it("should catch Unstaked event", async () => {
        await tokenStaking
          .connect(user1)
          .stakeTokens(ethers.utils.parseEther("100"), SILVER);
        await tokenStaking
          .connect(user1)
          .stakeTokens(ethers.utils.parseEther("200"), SILVER);

        await time.increase(time.duration.days(31));

        await expect(tokenStaking.connect(user1).unstakeTokens(1))
          .to.emit(tokenStaking, "Unstaked")
          .withArgs(user1.address, "1");
      });
    });
  });

  describe("forceWithdraw", () => {
    beforeEach(async () => {
      await token
        .connect(user1)
        .approve(tokenStaking.address, ethers.utils.parseEther("20000"));
      await token
        .connect(user2)
        .approve(tokenStaking.address, ethers.utils.parseEther("20000"));

      await token.approve(
        tokenStaking.address,
        ethers.utils.parseEther("2000000")
      );
      await tokenStaking.addStakedTokenReward(ethers.utils.parseEther("100"));
    });

    it("should revert if stake not defined", async () => {
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);

      await expectRevert(
        tokenStaking.connect(user1).forceWithdraw("1"),
        "The stake you are searching for is not defined"
      );

      await time.increase(time.duration.days(16));

      await tokenStaking.connect(user1).forceWithdraw(0);
    });

    it("should revert if stake already withdrawn", async () => {
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);
      await time.increase(time.duration.days(31));

      await tokenStaking.connect(user1).unstakeTokens(0);

      await expectRevert(
        tokenStaking.connect(user1).forceWithdraw(0),
        "The stake is already withdrawn."
      );
    });

    it("should close the staking package(set _withdrawnTimestamp)", async () => {
      let stake;
      let timestamp = new Date(Math.floor(Date.now() / 1000));

      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);
      stake = await tokenStaking.stakes(user1.address, 0);
      await time.increase(time.duration.days(31));
      expect(stake._withdrawnTimestamp).to.equal("0");
      await tokenStaking.connect(user1).forceWithdraw(0);
      stake = await tokenStaking.stakes(user1.address, 0);
      expect(new Date(parseInt(stake._withdrawnTimestamp))).to.afterOrEqualDate(
        timestamp
      );

      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("60"), PLATINUM);
      stake = await tokenStaking.stakes(user1.address, 1);
      await time.increase(time.duration.days(100));
      expect(stake._withdrawnTimestamp).to.equal("0");
      await tokenStaking.connect(user1).forceWithdraw(1);
      stake = await tokenStaking.stakes(user1.address, 1);
      expect(new Date(parseInt(stake._withdrawnTimestamp))).to.afterOrEqualDate(
        timestamp
      );

      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);
      stake = await tokenStaking.stakes(user1.address, 2);
      await time.increase(time.duration.days(31));
      expect(stake._withdrawnTimestamp).to.equal("0");
      await tokenStaking.connect(user1).forceWithdraw(2);
      stake = await tokenStaking.stakes(user1.address, 2);
      expect(new Date(parseInt(stake._withdrawnTimestamp))).to.afterOrEqualDate(
        timestamp
      );
    });

    it("should decrease total balance", async () => {
      expect(await tokenStaking.totalStakedFunds()).to.equal("0");
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("60"), PLATINUM);
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);
      await time.increase(time.duration.days(100));

      expect(await tokenStaking.totalStakedFunds()).to.equal(
        ethers.utils.parseEther("160")
      );
      await tokenStaking.connect(user1).forceWithdraw(0);
      expect(await tokenStaking.totalStakedFunds()).to.equal(
        ethers.utils.parseEther("110")
      );

      await tokenStaking.connect(user1).forceWithdraw(1);
      expect(await tokenStaking.totalStakedFunds()).to.equal(
        ethers.utils.parseEther("50")
      );

      await tokenStaking.connect(user1).forceWithdraw(2);
      expect(await tokenStaking.totalStakedFunds()).to.equal(
        ethers.utils.parseEther("0")
      );
    });

    it("should decrease user total staked balance", async () => {
      expect(await tokenStaking.totalStakedBalance(user1.address)).to.equal(
        "0"
      );
      expect(await tokenStaking.totalStakedBalance(user2.address)).to.equal(
        "0"
      );

      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("60"), PLATINUM);
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);
      await time.increase(time.duration.days(100));

      expect(await tokenStaking.totalStakedBalance(user1.address)).to.equal(
        ethers.utils.parseEther("160")
      );

      await tokenStaking.connect(user1).forceWithdraw(0);
      expect(await tokenStaking.totalStakedBalance(user1.address)).to.equal(
        ethers.utils.parseEther("110")
      );

      await tokenStaking.connect(user1).forceWithdraw(1);
      expect(await tokenStaking.totalStakedBalance(user1.address)).to.equal(
        ethers.utils.parseEther("50")
      );

      await tokenStaking.connect(user1).forceWithdraw(2);
      expect(await tokenStaking.totalStakedBalance(user1.address)).to.equal(
        ethers.utils.parseEther("0")
      );
    });

    it("should revert if try to forceWithdraw sooner than the blocked time", async () => {
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("50"), SILVER);
      await time.increase(time.duration.days(6));

      await expectRevert(
        tokenStaking.connect(user1).forceWithdraw(0),
        "Cannot unstake sooner than the blocked time."
      );

      await time.increase(time.duration.days(10));
      await tokenStaking.connect(user1).forceWithdraw(0);
    });

    it("should catch ForcefullyWithdrawn event", async () => {
      await tokenStaking
        .connect(user1)
        .stakeTokens(ethers.utils.parseEther("100"), SILVER);
      await time.increase(time.duration.days(31));

      await expect(tokenStaking.connect(user1).forceWithdraw(0))
        .to.emit(tokenStaking, "ForcefullyWithdrawn")
        .withArgs(user1.address, "0");
    });
  });
});
