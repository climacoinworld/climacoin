// scripts/transfer_ownership.js
async function main() {
  const gnosisSafe = '0x7951C9C4006e01baf87c6065F0438F93dAB563fB';
 
  console.log("Transferring ownership of ProxyAdmin...");
  // The owner of the ProxyAdmin can upgrade our contracts
  await upgrades.admin.transferProxyAdminOwnership(gnosisSafe);
  console.log("Transferred ownership of ProxyAdmin to:", gnosisSafe);
}
 
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
