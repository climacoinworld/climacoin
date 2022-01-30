// scripts/deploy_vesting.js
const {
  token,
  beneficiary,
  cliff,
  releasesCount,
  duration,
  tokensAllocated,
} = require("./token_vesting_params.json");

async function main() {
  const TokenVesting = await ethers.getContractFactory("TokenVesting");
  console.log("Deploying TokenVesting...");
  const tokenVesting = await TokenVesting.deploy(
    token,
    beneficiary,
    cliff,
    releasesCount,
    duration,
    tokensAllocated
  );
  console.log("TokenVesting deployed to:", tokenVesting.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
