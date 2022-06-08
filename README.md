# Climacoin Smart Contracts

## Smart Contracts

Smart contracts included in this repo:
- `ClimacoinToken.sol` - The Climacoin token which is an ERC-20 token that's going to be deployed on Polygon Network. The token has mint and burn functionalities and it's not capped.
- `TokenVesting.sol` - A token vesting contract that can release its tokens gradually like a typical vesting scheme. It will be used for token distribution.
- `TokenStaking.sol` - A token holder contract that allows users to stake an ERC20 token and receive rewards in the native token. Can be used for staking. This contract is **upgradeable**, so it can receive improvements in the future. Read more about it here: [Writing Upgradeable Contracts](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable).

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

### ClimacoinToken.sol

To deploy the token contract, run:  
`npx hardhat run scripts/deploy_token.js --network [NETWORK]`

For Polygon Testnet:  
`npx hardhat run scripts/deploy_token.js --network mumbai`

### TokenVesting.sol

Before running the deployment script for vesting, you need to set up some environment variables. Replace the parameters inside `./scripts/token_vesting_params.json` with your own parameters:  
- `token`: Address of the token. This token will be received by the beneficiary.
- `beneficiary`: List with the addresses of the beneficiaries.
- `cliff`: List with the cliff for each beneficiary. Cliff is the lock period from the vesting scheme, measured in seconds. Example: a cliff period of 6 months translates to 14515200 (60 * 60 * 24 * 7 * 4 * 6).
- `releasesCount`: List with the number of upcoming releases for each beneficiary, once the cliff has been touched.
- `duration`: List with the duration of each release for each beneficiary, measured in seconds (_e.g. 4233600 for 7 weeks_).
- `tokensAllocated`: List with the tokens allocated for each beneficiary.

To deploy the vesting contract, run:  
`npx hardhat run scripts/deploy_vesting.js --network [NETWORK]`

For Polygon Testnet:  
`npx hardhat run scripts/deploy_vesting.js --network mumbai`

### TokenStaking.sol

Before running the deployment script for staking, you need to set up some environment variables. Replace the parameters inside `./scripts/token_staking_params.json` with your own parameters:  
- `token`: Address of the native token. The users can stake any amount of this token to increase their total balance.

To deploy the staking contract, run:  
`npx hardhat run scripts/deploy_staking.js --network [NETWORK]`

For Polygon Testnet:  
`npx hardhat run scripts/deploy_staking.js --network mumbai`

*All the available networks can be found in `hardhat.config.js`.*

## How it works

### ClimacoinToken.sol - deployed on Polygon Testnet [here](https://mumbai.polygonscan.com/address/0xb4AE58AE84aB13fd235447bD1c9F7D2545C23C88)

The Climacoin token which has an initial supply of 29 billions (29000000000). The token is both mintable and burnable.

***Available methods that can be called:***  

[Roles and read methods](https://mumbai.polygonscan.com/address/0xb4AE58AE84aB13fd235447bD1c9F7D2545C23C88#readContract):
1) BURNER_ROLE - anyone with this role can burn tokens
2) MINTER_ROLE - anyone with this role can mint tokens
3) DEFAULT_ADMIN_ROLE - anyone with this role can grant/revoke roles 
4) `hasRole(role, account)`: check if the specific `account` has the specific `role`
5) `balanceOf(account)`: check the balance of the specific `account`

[Write methods](https://mumbai.polygonscan.com/address/0xb4AE58AE84aB13fd235447bD1c9F7D2545C23C88#writeContract):
1) `burn(from, amount)`: Burn the specific `amount` of tokens from the specific address. Only the address with `BURNER_ROLE` can call this method.
2) `mint(to, amount)`: Mint the specific `amount` of tokens to the specific address. address. Only the address with `MINTER_ROLE` can call this method.
3) `grantRole(role, account)`: Grant the specific `role` to the specific `account`. Only the address with `DEFAULT_ADMIN_ROLE` can call this method.
4) `revokeRole(role, account)`: Revoke the specific `role` from the specific `account`. Only the address with `DEFAULT_ADMIN_ROLE` can call this method.

### TokenVesting.sol - deployed on Polygon Testnet [here](https://mumbai.polygonscan.com/address/0xAEc5Aa712997f80CB98072F8C957d20047bC57c8)

After deploying it, the **vesting contract** should receive tokens for future vesting logic. The owner can simply transfer the required amount of tokens to the contract address. When the time will be reached, release tokens will be available for claiming. There will be multiple releases with the same delay between them.  

***Available methods that can be called:***  

[Roles and read methods](https://mumbai.polygonscan.com/address/0xAEc5Aa712997f80CB98072F8C957d20047bC57c8#readContract):
1) `beneficiaries()`: A list with all the beneficiaries that are included in the vesting scheme.
2) `contractBalance()`: The total tokens, currently locked inside the vesting contract, that are waiting to be claimed.
3) `start(beneficiary)`: When the vesting starts for the specific `beneficiary`. It is represented as a unix timestamp.
4) `finish(beneficiary)`: When the vesting ends for the specific `beneficiary`. It is represented as a unix timestamp.
5) `getAvailableTokens(beneficiary)`: Get the number of tokens that can be claimed by the beneficiary now.

[Write methods](https://mumbai.polygonscan.com/address/0xAEc5Aa712997f80CB98072F8C957d20047bC57c8#writeContract):
1) `addBeneficiary(beneficiary, cliff, releasesCount, duration, tokensAllocated)`: Add a new beneficiary to the vesting contract with the specified vesting conditions. Can be called only by the owner of the vesting contract.
2) `release()`: Releases all vested tokens that were not claimed yet. Can be called only by the beneficiary.
3) `releaseForAll()`: Releases all vested tokens for all the beneficiaries. Can be called only by the owner.

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
