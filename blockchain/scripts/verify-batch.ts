import hre from "hardhat";

/**
 * Verify batch authenticity by querying the blockchain
 * Usage: npx hardhat run scripts/verify-batch.ts --network sepolia -- BCH-001
 */

async function main() {
  const contractAddress = process.env.MEDI_TRUST_CHAIN_ADDRESS;
  if (!contractAddress) {
    throw new Error("MEDI_TRUST_CHAIN_ADDRESS not set in .env");
  }

  const batchCode = process.argv[4]; // Get from command line
  if (!batchCode) {
    throw new Error("Please provide batch code as argument: npx hardhat run scripts/verify-batch.ts -- BCH-001");
  }

  const mediTrustChain = await hre.ethers.getContractAt("MediTrustChain", contractAddress);

  console.log(`\nVerifying batch: ${batchCode}`);
  console.log("-".repeat(50));

  // Get batch ID from code
  const batchId = await mediTrustChain.getBatchIdByCode(batchCode);
  console.log(`Batch ID: ${batchId}`);

  // Get batch details
  const batch = await mediTrustChain.getBatch(batchId);
  const statusNames = [
    "CREATED",
    "PENDING_APPROVAL",
    "APPROVED",
    "REJECTED",
    "IN_TRANSIT",
    "DELIVERED",
    "EXPIRED",
    "RECALLED",
  ];

  console.log(`
Drug: ${batch.drugName}
Quantity: ${batch.quantity}
Manufacturer: ${batch.manufacturer}
Status: ${statusNames[batch.status]}
Created: ${new Date(Number(batch.createdAt) * 1000).toISOString()}
Data Hash: ${batch.dataHash}
Is Recalled: ${batch.isRecalled}
  `);

  // Verify authenticity
  const [isGenuine, status] = await mediTrustChain.verifyBatchAuthenticity(batchId);
  console.log("-".repeat(50));
  console.log(`Authentic: ${isGenuine ? "✓ YES" : "✗ NO"}`);
  console.log(`Verification Status: ${status}`);

  // Get batch history
  const history = await mediTrustChain.getBatchHistory(batchId);
  console.log(`\nBatch History (${history.length} entries):`);
  history.forEach((entry, index) => {
    console.log(`  ${index + 1}. ${new Date(Number(entry.timestamp) * 1000).toISOString()}`);
    console.log(`     Location: ${entry.location}`);
    console.log(`     Status: ${statusNames[entry.status]}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
