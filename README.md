# ClimaCoin Smart Contracts

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

Before running the deployment scripts, you need to set up some environment variables. Replace the parameters inside `./scripts/token_vesting_params.json` with your own parameters:  
- `token`: Address of the token. This token will be received by the beneficiary.
- `beneficiary`: Address of the beneficiary, which receives vested tokens.
- `start`: Time when vesting start (_should be the UNIX timestamp of a certain date. e.g. 1635760800 for 01.11.2021 12:00:00_).
- `duration`: Duration in seconds of each release (_e.g. 604800 for 7 weeks_).
- `releasesCount`: Total amount of upcoming releases.
- `revocable`: Specifies if the owner of the vesting contract can revoke the contract in the future.

To deploy the contract, run:  
`npx hardhat run scripts/deploy_vesting.js --network [NETWORK]`  

Available networks can be found in `hardhat.config.js`.

### How it works

After deploying it, the **vesting contract** should receive tokens for future vesting logic. The owner can simply transfer the required amount of tokens to the contract address. When the time will be reached, release tokens will be available for claiming. There will be multiple releases with the same delay between them. 

### Available methods that can be called:

1) `getAvailableTokens()`: Get the number of tokens that can be claimed by the beneficiary at that specific moment in time. Can be called by anyone.
2) `release()`: Releases all vested tokens that were not claimed yet. Can be called only be the beneficiary.
3) `revoke()`: Cancels the vesting. Tokens that are not vested will return to the owner. Tokens that are vested, but not claimed, remain in the contract until the next `release`. Can be called only be the owner of the vesting contract.
