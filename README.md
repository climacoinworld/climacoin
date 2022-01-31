# ClimaCoin Smart Contracts

## Smart Contracts

Smart contracts included in this repo:
- `ClimacoinToken.sol` - The Climacoin token which is an ERC-20 token that's going to be deployed on Polygon Network. The token has mint and burn functionalities and it's not capped.
- `TokenVesting.sol` - A token vesting contract that can release its tokens gradually like a typical vesting scheme. It will be used for token distribution.

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
For Polygon Testnet:
`npx hardhat run scripts/deploy_token.js --network mumbai`

### TokenVesting.sol

Before running the deployment script for vesting, you need to set up some environment variables. Replace the parameters inside `./scripts/token_vesting_params.json` with your own parameters:  
- `token`: Address of the token. This token will be received by the beneficiary.
- `beneficiary`: List with the addresses of the beneficiaries.
- `cliff`: List with the cliff for each beneficiary. Cliff is the lock period from the vesting scheme, measured in seconds. Example: a cliff period of 6 months translates to 14515200 (60 * 60 * 24 * 7 * 4 * 6).
- `releasesCount`: List with the number of upcoming releases for each beneficiary, once the cliff has been touched.
- `duration`: List with the duration in seconds of each release, for each beneficiary (_e.g. 4233600 for 7 weeks_).
- `tokensAllocated`: List with the tokens allocated to each beneficiary.

To deploy the vesting contract, run:  
`npx hardhat run scripts/deploy_vesting.js --network [NETWORK]`  
For Polygon Testnet:
`npx hardhat run scripts/deploy_vesting.js --network mumbai`

*All the available networks can be found in `hardhat.config.js`.*

## How it works

### TokenVesting.sol

After deploying it, the **vesting contract** should receive tokens for future vesting logic. The owner can simply transfer the required amount of tokens to the contract address. When the time will be reached, release tokens will be available for claiming. There will be multiple releases with the same delay between them.  

***Available methods that can be called:***  

1) `getAvailableTokens()`: Get the number of tokens that can be claimed by the beneficiary at that specific moment in time. Can be called by anyone.
2) `release()`: Releases all vested tokens that were not claimed yet. Can be called only be the beneficiary.
3) `revoke()`: Cancels the vesting. Tokens that are not vested will return to the owner. Tokens that are vested, but not claimed, remain in the contract until the next `release`. Can be called only be the owner of the vesting contract.
