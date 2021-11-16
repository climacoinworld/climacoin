// contracts/TokenStaking.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";

contract TokenStaking is Initializable, AccessControlUpgradeable {
    using SafeMathUpgradeable for uint256;

    bytes32 public constant REWARD_PROVIDER = keccak256("REWARD_PROVIDER"); // i upgraded solc and used REWARD_PROVIDER instead of whitelist role and DEFAULT_ADMIN_ROLE instead of whiteloist admin
    uint256 private constant TIME_UNIT = 86400;
    // we can improve this with a "unstaked:false" flag when the user force withdraws the funds
    // so he can collect the reward later
    struct Stake {
        uint256 _amount;
        uint256 _timestamp;
        bytes32 _packageName;
        uint256 _withdrawnTimestamp;
    }

    struct YieldType {
        bytes32 _packageName;
        uint256 _daysLocked;
        uint256 _daysBlocked;
        uint256 _packageInterest;
    }

    IERC20Upgradeable public tokenContract;

    mapping(bytes32 => YieldType) public packages;
    mapping(address => uint256) public totalStakedBalance;
    mapping(address => Stake[]) public stakes;
    mapping(address => bool) public hasStaked;
    address[] stakers;
    uint256 rewardProviderTokenAllowance = 0;
    uint256 public totalStakedFunds = 0;
    bool public paused = false;

    event NativeTokenRewardAdded(address indexed _from, uint256 _val);
    event NativeTokenRewardRemoved(address indexed _to, uint256 _val);
    event StakeAdded(
        address indexed _usr,
        bytes32 _packageName,
        uint256 _amount,
        uint256 _stakeIndex
    );
    event Unstaked(address indexed _usr, uint256 stakeIndex);
    event ForcefullyWithdrawn(address indexed _usr, uint256 stakeIndex);
    event Paused();
    event Unpaused();

    modifier onlyRewardProvider() {
        require(
            hasRole(REWARD_PROVIDER, _msgSender()),
            "caller does not have the REWARD_PROVIDER role"
        );
        _;
    }

    modifier onlyMaintainer() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "caller does not have the Maintainer role"
        );
        _;
    }

    function initialize(address _stakedToken) public virtual initializer {
        __AccessControl_init();

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        tokenContract = IERC20Upgradeable(_stakedToken);
        //define packages here
        _definePackage("Silver Package", 30, 15, 8); // in 30 days you receive: 15% of staked token
        _definePackage("Gold Package", 60, 30, 18);
        _definePackage("Platinum Package", 90, 45, 30);
    }

    function checkStakeReward(address _address, uint256 stakeIndex)
        public
        view
        returns (uint256 yieldReward, uint256 timeDiff)
    {
        uint256 currentTime = block.timestamp;
        if (stakes[_address][stakeIndex]._withdrawnTimestamp != 0) {
            currentTime = stakes[_address][stakeIndex]._withdrawnTimestamp;
        }

        uint256 stakingTime = stakes[_address][stakeIndex]._timestamp;
        uint256 daysLocked = packages[stakes[_address][stakeIndex]._packageName]
            ._daysLocked;
        uint256 packageInterest = packages[
            stakes[_address][stakeIndex]._packageName
        ]._packageInterest;

        timeDiff = currentTime.sub(stakingTime).div(TIME_UNIT);

        uint256 yieldPeriods = timeDiff.div(daysLocked); // the _days is in seconds for now so can fucking test stuff

        yieldReward = 0;
        uint256 totalStake = stakes[_address][stakeIndex]._amount;

        // for each period of days defined in the package, compound the interest
        while (yieldPeriods > 0) {
            uint256 currentReward = totalStake.mul(packageInterest).div(100);

            totalStake = totalStake.add(currentReward);

            yieldReward = yieldReward.add(currentReward);

            yieldPeriods--;
        }
    }

    function stakeTokens(uint256 _amount, bytes32 _packageName) public {
        require(paused == false, "Staking is paused");
        require(_amount > 0, " stake a positive number of tokens ");
        require(
            packages[_packageName]._daysLocked > 0,
            "there is no staking package with the declared name, or the staking package is poorly formated"
        );

        //add to stake sum of address
        totalStakedBalance[msg.sender] = totalStakedBalance[msg.sender].add(
            _amount
        );

        //add to stakes
        Stake memory currentStake;
        currentStake._amount = _amount;
        currentStake._timestamp = block.timestamp;
        currentStake._packageName = _packageName;
        currentStake._withdrawnTimestamp = 0;
        stakes[msg.sender].push(currentStake);

        //if user is not declared as a staker, push him into the staker array
        if (!hasStaked[msg.sender]) {
            stakers.push(msg.sender);
        }

        //update the bool mapping of past and current stakers
        hasStaked[msg.sender] = true;
        totalStakedFunds = totalStakedFunds.add(_amount);

        //transfer from (need allowance)
        tokenContract.transferFrom(msg.sender, address(this), _amount);

        emit StakeAdded(
            msg.sender,
            _packageName,
            _amount,
            stakes[msg.sender].length - 1
        );
    }

    function unstakeTokens(uint256 stakeIndex) public {
        require(
            stakeIndex < stakes[msg.sender].length,
            "The stake you are searching for is not defined"
        );
        require(
            stakes[msg.sender][stakeIndex]._withdrawnTimestamp == 0,
            "Stake already withdrawn"
        );

        // decrease total balance
        totalStakedFunds = totalStakedFunds.sub(
            stakes[msg.sender][stakeIndex]._amount
        );

        //decrease user total staked balance
        totalStakedBalance[msg.sender] = totalStakedBalance[msg.sender].sub(
            stakes[msg.sender][stakeIndex]._amount
        );

        //close the staking package (fix the withdrawn timestamp)
        stakes[msg.sender][stakeIndex]._withdrawnTimestamp = block.timestamp;

        (uint256 reward, uint256 daysSpent) = checkStakeReward(
            msg.sender,
            stakeIndex
        );

        require(
            rewardProviderTokenAllowance > reward,
            "Token creators did not place enough liquidity in the contract for your reward to be paid"
        );

        require(
            daysSpent >
                packages[stakes[msg.sender][stakeIndex]._packageName]
                    ._daysBlocked,
            "cannot unstake sooner than the blocked time"
        );

        rewardProviderTokenAllowance = rewardProviderTokenAllowance.sub(reward);

        uint256 totalStake = stakes[msg.sender][stakeIndex]._amount.add(reward);

        tokenContract.transfer(msg.sender, totalStake);

        emit Unstaked(msg.sender, stakeIndex);
    }

    function forceWithdraw(uint256 stakeIndex) public {
        require(
            stakes[msg.sender][stakeIndex]._amount > 0,
            "The stake you are searching for is not defined"
        );
        require(
            stakes[msg.sender][stakeIndex]._withdrawnTimestamp == 0,
            "Stake already withdrawn"
        );

        stakes[msg.sender][stakeIndex]._withdrawnTimestamp = block.timestamp;
        totalStakedFunds = totalStakedFunds.sub(
            stakes[msg.sender][stakeIndex]._amount
        );
        totalStakedBalance[msg.sender] = totalStakedBalance[msg.sender].sub(
            stakes[msg.sender][stakeIndex]._amount
        );

        uint256 daysSpent = block
            .timestamp
            .sub(stakes[msg.sender][stakeIndex]._timestamp)
            .div(TIME_UNIT); //86400

        require(
            daysSpent >
                packages[stakes[msg.sender][stakeIndex]._packageName]
                    ._daysBlocked,
            "cannot unstake sooner than the blocked time time"
        );

        tokenContract.transfer(
            msg.sender,
            stakes[msg.sender][stakeIndex]._amount
        );

        emit ForcefullyWithdrawn(msg.sender, stakeIndex);
    }

    function pauseStaking() public onlyMaintainer {
        paused = true;
        emit Paused();
    }

    function unpauseStaking() public onlyMaintainer {
        paused = false;
        emit Unpaused();
    }

    function addStakedTokenReward(uint256 _amount)
        public
        onlyRewardProvider
        returns (bool)
    {
        //transfer from (need allowance)
        rewardProviderTokenAllowance = rewardProviderTokenAllowance.add(
            _amount
        );
        tokenContract.transferFrom(msg.sender, address(this), _amount);

        emit NativeTokenRewardAdded(msg.sender, _amount);
        return true;
    }

    function removeStakedTokenReward(uint256 _amount)
        public
        onlyRewardProvider
        returns (bool)
    {
        require(
            _amount <= rewardProviderTokenAllowance,
            "you cannot withdraw this amount"
        );
        rewardProviderTokenAllowance = rewardProviderTokenAllowance.sub(
            _amount
        );
        tokenContract.transfer(msg.sender, _amount);
        emit NativeTokenRewardRemoved(msg.sender, _amount);
        return true;
    }

    function _definePackage(
        bytes32 _name,
        uint256 _days,
        uint256 _daysBlocked,
        uint256 _packageInterest
    ) private {
        YieldType memory package;
        package._packageName = _name;
        package._daysLocked = _days;
        package._packageInterest = _packageInterest;
        package._daysBlocked = _daysBlocked;
        packages[_name] = package;
    }
}
