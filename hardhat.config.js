// hardhat.config.js
const { alchemyApiKeyGoerli, alchemyApiKeyRinkeby, mnemonic } = require("./secrets.json");

require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-web3");
require("@openzeppelin/hardhat-upgrades");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.9",
  networks: {
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${alchemyApiKeyGoerli}`,
      accounts: { mnemonic: mnemonic },
    },
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${alchemyApiKeyRinkeby}`,
      accounts: { mnemonic: mnemonic },
    },
    bsctestnet: {
      url: `https://data-seed-prebsc-1-s1.binance.org:8545`,
      accounts: { mnemonic: mnemonic },
    },
  },
};
