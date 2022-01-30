// scripts/deploy_vesting.js
const {
  token,
  beneficiary,
  start,
  duration,
  releasesCount,
  revocable,
} = require("./token_vesting_params.json");

async function main() {
  const TokenVesting = await ethers.getContractFactory("TokenVesting");
  console.log("Deploying TokenVesting...");
  const tokenVesting = await TokenVesting.deploy(
    token,
    beneficiary,
    start,
    duration,
    releasesCount,
    revocable
  );
  console.log("TokenVesting deployed to:", tokenVesting.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
