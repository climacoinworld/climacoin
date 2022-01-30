// scripts/deploy_token.js
async function main() {
  const ClimaCoinToken = await ethers.getContractFactory(
    "ClimaCoinTokenNonUpgradeable"
  );
  console.log("Deploying ClimaCoinToken...");
  const climaCoinToken = await ClimaCoinToken.deploy(
    "Climacoin",
    "CLC",
    29000000000
  );
  console.log("ClimaCoinToken deployed to:", climaCoinToken.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
