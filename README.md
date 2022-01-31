# Climacoin Smart Contracts

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
- `duration`: List with the duration in seconds of each release, for each beneficiary (_e.g. 4233600 for 7 weeks_).
- `tokensAllocated`: List with the tokens allocated for each beneficiary.

To deploy the vesting contract, run:  
`npx hardhat run scripts/deploy_vesting.js --network [NETWORK]`

For Polygon Testnet:
`npx hardhat run scripts/deploy_vesting.js --network mumbai`

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

### TokenVesting.sol - deployed on Polygon Testnet [here](https://mumbai.polygonscan.com/address/0xfB55B2b357b5b19E953Fbf4bA90767ADB5c1ed1F)

After deploying it, the **vesting contract** should receive tokens for future vesting logic. The owner can simply transfer the required amount of tokens to the contract address. When the time will be reached, release tokens will be available for claiming. There will be multiple releases with the same delay between them.  

***Available methods that can be called:***  

[Roles and read methods](https://mumbai.polygonscan.com/address/0xfB55B2b357b5b19E953Fbf4bA90767ADB5c1ed1F#readContract):
1) `beneficiaries()`: A list with all the beneficiaries that are included in the vesting scheme.
2) `contractBalance()`: The total tokens, currently locked inside the vesting contract, that are waiting to be claimed.
3) `start(beneficiary)`: When the vesting starts for the specific `beneficiary`. It is represented as a unix timestamp.
4) `finish(beneficiary)`: When the vesting ends for the specific `beneficiary`. It is represented as a unix timestamp.
5) `getAvailableTokens(beneficiary)`: Get the number of tokens that can be claimed by the beneficiary now.

[Write methods](https://mumbai.polygonscan.com/address/0xfB55B2b357b5b19E953Fbf4bA90767ADB5c1ed1F#writeContract):
1) `addBeneficiary(beneficiary, cliff, releasesCount, duration, tokensAllocated)`: Add a new beneficiary to the vesting contract with the specified vesting conditions. Can be called only by the owner of the vesting contract.
2) `release()`: Releases all vested tokens that were not claimed yet. Can be called only be the beneficiary.
