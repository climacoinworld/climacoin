// scripts/deploy_staking.js
const { token } = require("./token_staking_params.json");

async function main() {
  const TokenStaking = await ethers.getContractFactory("TokenStaking");
  console.log("Deploying TokenStaking...");
  const tokenStaking = await upgrades.deployProxy(TokenStaking, [token], {
    initializer: "initialize",
  });
  console.log("TokenStaking deployed to:", tokenStaking.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
