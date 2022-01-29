# ClimaCoin Smart Contracts

## Smart Contracts

Smart contracts included in this repo:
- `ClimaCoinToken.sol` - The ClimaCoin token which can be deployed on both Ethereum Blockchain (ERC-20) and Binance Smart Chain (BEP-20). 
- `TokenStaking.sol` - A token holder contract that allows users to stake an ERC20 token and receive rewards in the native token. Can be used for staking.
- `TokenVesting.sol` - A token holder contract that can release its tokens gradually like a typical vesting scheme. Can be used for distribution.
  
All the contracts in this repository are **upgradeable**, meaning that they can be benefit from improvements in the future. Read more about it here: [Writing Upgradeable Contracts](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable).

## Installation

Clone this repository:  
`git clone https://github.com/climacoinworld/climacoin-smart-contracts`

Install dependencies:  
`cd climacoin-smart-contracts && npm install`

## Tests

For UNIT tests, run:  
`npx hardhat test`

The project uses [Hardhat](https://hardhat.org/). For additional information, please visit their [website](https://hardhat.org/getting-started/).

## Deployment

### ClimaCoinToken.sol

To deploy the token contract, run:  
`npx hardhat run scripts/deploy_token.js --network [NETWORK]`  

### TokenStaking.sol

Before running the deployment script for staking, you need to set up some environment variables. Replace the parameters inside `./scripts/token_staking_params.json` with your own parameters:  
- `token`: Address of the native token. The users can stake any amount of this token to increase their total balance.

To deploy the staking contract, run:  
`npx hardhat run scripts/deploy_staking.js --network [NETWORK]`  

### TokenVesting.sol

Before running the deployment script for vesting, you need to set up some environment variables. Replace the parameters inside `./scripts/token_vesting_params.json` with your own parameters:  
- `token`: Address of the token. This token will be received by the beneficiary.
- `beneficiary`: Address of the beneficiary, which receives vested tokens.
- `start`: Time when vesting start (_should be the UNIX timestamp of a certain date. e.g. 1635760800 for 01.11.2021 12:00:00_).
- `duration`: Duration in seconds of each release (_e.g. 604800 for 7 weeks_).
- `releasesCount`: Total amount of upcoming releases.
- `revocable`: Specifies if the owner of the vesting contract can revoke the contract in the future.

To deploy the vesting contract, run:  
`npx hardhat run scripts/deploy_vesting.js --network [NETWORK]`  

*Available networks can be found in `hardhat.config.js`.*

## How it works

### TokenStaking.sol

After deploying it, the staking contract should receive tokens via `addStakedTokenReward(amount)` for future staking logic. The contract owner is the only one who can call this method to add native tokens to the reward pool.

***Staking Packages:***  

Staking packages are predefined inside the constructor. The staking packages have the following components:

- **name**: represents the name of the package
- **days**: the number of days that need to pass to get the reward
- **daysBlocked**: the number of days after staking in which users cannot withdraw their tokens
- **compound interest**: the reward measured in % (i.e. 5%)

There are 3 staking packages, each with their own characteristics:
- **silver**: in 30 days you receive 8% of the staked tokens. The tokens are blocked for 15 days.
- **gold**: in 60 days you receive 18% of the staked tokens. The tokens are blocked for 30 days.
- **platinum**: in 90 days you receive 30% of the staked tokens. The tokens are blocked for 45 days.

***Staking Mechanism:***  

When choosing to stake tokens and receive the reward in the native token, users accumulate rewards which compound. The unstake function will calculate the compounded interest and return the whole amount (stake + compounded reward) to the user.

***Examples:***  

Given the following package:
- **name**: GOLD
- **days**: 60
- **daysBlocked**: 30
- **compound interest**: 18

If the user stakes $100 worth of TOKEN in the GOLD package, the user will receive 18% of the staked amount each 60 days. This staked amount compounds, such that after 120 days, the user receives $139.24 worth of TOKEN instead of just $136 worth of TOKEN. Note that the staked amount will be blocked for the first 30 days.

***Available methods that can be called:***  

1) `stakeTokens(amount, packageName)`: Stakes an amount of funds in a package. Can be called by anyone, usually called by the user.
2) `unstakeTokens(stakeIndex)`: Unstakes and retrieves the initial funds + the reward. If the reward is insufficient, the funds are blocked and the users cannot withdraw them. Can be called only by the same user who did the stake.
3) `forceWithdraw(stakeIndex)`: Same as `unstakeTokens`, but if the reward is insufficient, the users can still force withdraw their initial funds, without getting the reward.
4) `addStakedTokenReward(amount)`: Adds native token reward to the contract. Can be called only be the owner of the staking contract.
5) `removeStakedTokenReward(amount)`: Removes native token reward from the contract. Can be called only be the owner of the staking contract.
6) `checkStakeReward(address, stakeIndex)`: Returns the amount of native token that was accumulated for a stake. Can be called by anyone.
7) `pauseStaking()`: Pause the staking so users can no longer stake their funds. Can be called only be the owner of the staking contract.
8) `unpauseStaking()`: Unpause the staking so users can stake their funds. Can be called only be the owner of the staking contract.

### TokenVesting.sol

After deploying it, the **vesting contract** should receive tokens for future vesting logic. The owner can simply transfer the required amount of tokens to the contract address. When the time will be reached, release tokens will be available for claiming. There will be multiple releases with the same delay between them.  

***Available methods that can be called:***  

1) `getAvailableTokens()`: Get the number of tokens that can be claimed by the beneficiary at that specific moment in time. Can be called by anyone.
2) `release()`: Releases all vested tokens that were not claimed yet. Can be called only be the beneficiary.
3) `revoke()`: Cancels the vesting. Tokens that are not vested will return to the owner. Tokens that are vested, but not claimed, remain in the contract until the next `release`. Can be called only be the owner of the vesting contract.
