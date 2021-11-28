# ClimaCoin Smart Contracts

### Smart Contracts

Smart contracts included in this repo:
- `ClimaCoinToken.sol` - The ClimaCoin token which can be deployed on both Ethereum Blockchain (ERC-20) and Binance Smart Chain (BEP-20). 
- `TokenStaking.sol` - A token holder contract that allows users to stake an ERC20 token and receive rewards in the native token. Can be used for staking.
- `TokenVesting.sol` - A token holder contract that can release its tokens gradually like a typical vesting scheme. Can be used for distribution.
  
All the contracts in this repository are **upgradeable**, meaning that they can be benefit from improvements in the future. Read more about it here: [Writing Upgradeable Contracts](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable).

### Installation

Clone this repository:  
`git clone https://github.com/ctindogaru/climacoin`

Install dependencies:  
`cd climacoin && npm install`

### Tests

The project uses [Hardhat](https://hardhat.org/). For additional information go to their [website](https://hardhat.org/getting-started/).     
For UNIT tests, run:  
`npx hardhat test`

### Deployment

#### ClimaCoinToken.sol

To deploy the token contract, run:  
`npx hardhat run scripts/deploy_token.js --network [NETWORK]`  

#### TokenStaking.sol

Before running the deployment script for staking, you need to set up some environment variables. Replace the parameters inside `./scripts/token_staking_params.json` with your own parameters:  
- `token`: Address of the native token. The users can stake any amount of this token to increase their total balance.

To deploy the staking contract, run:  
`npx hardhat run scripts/deploy_staking.js --network [NETWORK]`  

#### TokenVesting.sol

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

### How it works

#### TokenStaking.sol

*Staking Packages:*  

Staking packages are predefined inside the constructor. The staking packages have the following components:

- name: represents the name of the package
- days: the number of days that need to pass to get the reward
- daysBlocked: the number of days after staking in which users cannot withdraw their tokens
- compound interest: the reward measured in % (i.e. 5%)

There are 3 staking packages, each with their own characteristics:
- silver: in 30 days you receive 8% of the staked tokens. The tokens are blocked for 15 days.
- gold: in 60 days you receive 18% of the staked tokens. The tokens are blocked for 30 days.
- platinum: in 90 days you receive 30% of the staked tokens. The tokens are blocked for 45 days.

*Available methods that can be called:*

1) `getAvailableTokens()`: Get the number of tokens that can be claimed by the beneficiary at that specific moment in time. Can be called by anyone.
2) `release()`: Releases all vested tokens that were not claimed yet. Can be called only be the beneficiary.
3) `revoke()`: Cancels the vesting. Tokens that are not vested will return to the owner. Tokens that are vested, but not claimed, remain in the contract until the next `release`. Can be called only be the owner of the vesting contract.

#### TokenVesting.sol

After deploying it, the **vesting contract** should receive tokens for future vesting logic. The owner can simply transfer the required amount of tokens to the contract address. When the time will be reached, release tokens will be available for claiming. There will be multiple releases with the same delay between them.  

*Available methods that can be called:*

1) `getAvailableTokens()`: Get the number of tokens that can be claimed by the beneficiary at that specific moment in time. Can be called by anyone.
2) `release()`: Releases all vested tokens that were not claimed yet. Can be called only be the beneficiary.
3) `revoke()`: Cancels the vesting. Tokens that are not vested will return to the owner. Tokens that are vested, but not claimed, remain in the contract until the next `release`. Can be called only be the owner of the vesting contract.
