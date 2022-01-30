// scripts/deploy_token.js
async function main() {
  const ClimacoinToken = await ethers.getContractFactory("ClimacoinToken");
  console.log("Deploying Climacoin Token...");
  const climaCoinToken = await ClimacoinToken.deploy(
    "Climacoin",
    "CLC",
    29000000000
  );
  console.log("Climacoin Token deployed to:", climaCoinToken.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
