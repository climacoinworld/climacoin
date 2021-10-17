// scripts/deploy_token.js
async function main() {
  const ClimaCoinToken = await ethers.getContractFactory("ClimaCoinToken");
  console.log("Deploying ClimaCoinToken...");
  const climaCoinToken = await upgrades.deployProxy(
    ClimaCoinToken,
    ["ClimaCoin Token", "CLC", 29000000000 * 10 ** 18],
    { initializer: "initialize" }
  );
  console.log("ClimaCoinToken deployed to:", climaCoinToken.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
