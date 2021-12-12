// contracts/TokenStaking.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";

contract TokenStaking is Initializable, AccessControlUpgradeable {
    using SafeMathUpgradeable for uint256;

    bytes32 public constant REWARD_PROVIDER_ROLE =
        keccak256("REWARD_PROVIDER_ROLE");
    uint256 private constant TIME_UNIT = 86400; // 1 day in seconds

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

    bytes32[] public packageNames;
    mapping(bytes32 => YieldType) public packages;
    mapping(address => uint256) public totalStakedBalance;
    mapping(address => Stake[]) public stakes;
    mapping(address => bool) public hasStaked;
    address[] stakers;
    uint256 rewardProviderTokenAllowance;
    uint256 public totalStakedFunds;
    bool public paused;

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
            hasRole(REWARD_PROVIDER_ROLE, _msgSender()),
            "The caller does not have the REWARD_PROVIDER_ROLE role."
        );
        _;
    }

    modifier onlyMaintainer() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "The caller does not have the DEFAULT_ADMIN_ROLE role."
        );
        _;
    }

    function initialize(address _stakedToken) public virtual initializer {
        __AccessControl_init();

        tokenContract = IERC20Upgradeable(_stakedToken);
        rewardProviderTokenAllowance = 0;
        totalStakedFunds = 0;
        paused = false;

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(REWARD_PROVIDER_ROLE, _msgSender());

        _definePackage("silver", 30, 15, 8); // in 30 days you receive 8% of the staked tokens. The tokens are blocked for 15 days.
        _definePackage("gold", 60, 30, 18); // in 60 days you receive 18% of the staked tokens. The tokens are blocked for 30 days.
        _definePackage("platinum", 90, 45, 30); // in 90 days you receive 30% of the staked tokens. The tokens are blocked for 45 days.
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

        timeDiff = currentTime.sub(stakingTime).div(TIME_UNIT); // the time in days
        uint256 yieldPeriods = timeDiff.div(daysLocked);

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

    function stakesLength(address _address) external view returns (uint256) {
        return stakes[_address].length;
    }

    function packageLength() external view returns (uint256) {
        return packageNames.length;
    }

    function stakeTokens(uint256 _amount, bytes32 _packageName) public {
        require(paused == false, "The staking is paused.");
        require(_amount > 0, "You need to stake a positive number of tokens.");
        require(
            packages[_packageName]._daysLocked > 0,
            "There is no staking package with the declared name or the staking package is poorly formated."
        );

        // add to stake sum of address
        totalStakedBalance[msg.sender] = totalStakedBalance[msg.sender].add(
            _amount
        );

        // add to stakes
        Stake memory currentStake;
        currentStake._amount = _amount;
        currentStake._timestamp = block.timestamp;
        currentStake._packageName = _packageName;
        currentStake._withdrawnTimestamp = 0;
        stakes[msg.sender].push(currentStake);

        // if the user is not declared as a staker, push him into the staker array
        if (!hasStaked[msg.sender]) {
            stakers.push(msg.sender);
        }

        // update the bool mapping of past and current stakers
        hasStaked[msg.sender] = true;
        totalStakedFunds = totalStakedFunds.add(_amount);

        // transfer from the caller to this contract (need allowance)
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
            "The stake you are searching for is not defined."
        );
        require(
            stakes[msg.sender][stakeIndex]._withdrawnTimestamp == 0,
            "The stake is already withdrawn."
        );

        // close the staking package (fix the withdrawn timestamp)
        stakes[msg.sender][stakeIndex]._withdrawnTimestamp = block.timestamp;

        // decrease total balance
        totalStakedFunds = totalStakedFunds.sub(
            stakes[msg.sender][stakeIndex]._amount
        );

        // decrease user total staked balance
        totalStakedBalance[msg.sender] = totalStakedBalance[msg.sender].sub(
            stakes[msg.sender][stakeIndex]._amount
        );

        (uint256 reward, uint256 daysSpent) = checkStakeReward(
            msg.sender,
            stakeIndex
        );

        require(
            rewardProviderTokenAllowance >= reward,
            "Token creators did not place enough liquidity in the contract for your reward to be paid."
        );

        require(
            daysSpent >
                packages[stakes[msg.sender][stakeIndex]._packageName]
                    ._daysBlocked,
            "Cannot unstake sooner than the blocked time."
        );

        rewardProviderTokenAllowance = rewardProviderTokenAllowance.sub(reward);

        uint256 totalStake = stakes[msg.sender][stakeIndex]._amount.add(reward);

        tokenContract.transfer(msg.sender, totalStake);

        emit Unstaked(msg.sender, stakeIndex);
    }

    function forceWithdraw(uint256 stakeIndex) public {
        require(
            stakeIndex < stakes[msg.sender].length,
            "The stake you are searching for is not defined."
        );
        require(
            stakes[msg.sender][stakeIndex]._withdrawnTimestamp == 0,
            "The stake is already withdrawn."
        );

        // close the staking package (fix the withdrawn timestamp)
        stakes[msg.sender][stakeIndex]._withdrawnTimestamp = block.timestamp;

        // decrease total balance
        totalStakedFunds = totalStakedFunds.sub(
            stakes[msg.sender][stakeIndex]._amount
        );

        // decrease user total staked balance
        totalStakedBalance[msg.sender] = totalStakedBalance[msg.sender].sub(
            stakes[msg.sender][stakeIndex]._amount
        );

        uint256 daysSpent = block
            .timestamp
            .sub(stakes[msg.sender][stakeIndex]._timestamp)
            .div(TIME_UNIT);

        require(
            daysSpent >
                packages[stakes[msg.sender][stakeIndex]._packageName]
                    ._daysBlocked,
            "Cannot unstake sooner than the blocked time."
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
        rewardProviderTokenAllowance = rewardProviderTokenAllowance.add(
            _amount
        );
        // transfer from the caller to this contract (need allowance)
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
            "You cannot withdraw this amount."
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
        packageNames.push(_name);
    }
}
