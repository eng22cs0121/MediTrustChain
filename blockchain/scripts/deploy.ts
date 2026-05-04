import hre from "hardhat";

async function main() {
  console.log("=".repeat(50));
  console.log("MediTrustChain Blockchain Setup Script");
  console.log("=".repeat(50));

  const network = hre.network.name;
  console.log(`\nNetwork: ${network}`);

  // Get signers
  const signers = await hre.ethers.getSigners();
  const owner = signers[0];
  console.log(`Owner: ${owner.address}`);
  console.log(`Available signers: ${signers.length}`);

  // Deploy contract
  console.log("\nDeploying MediTrustChain contract...");
  const MediTrustChainFactory = await hre.ethers.getContractFactory("MediTrustChainV2");
  const mediTrustChain = await MediTrustChainFactory.deploy();
  await mediTrustChain.waitForDeployment();
  const contractAddress = await mediTrustChain.getAddress();
  console.log(`✓ Contract deployed at: ${contractAddress}`);

  // Register manufacturer (owner)
  console.log("\nRegistering manufacturer...");
  let tx = await mediTrustChain.registerUser(0, "MediTrustChain Pharmaceutical");
  await tx.wait();
  console.log("✓ Manufacturer registered");

  // Only register additional users if we have multiple signers (local network)
  if (signers.length > 1) {
    const regulator = signers[1];
    const distributor = signers[2];

    // Register regulator
    console.log("\nRegistering regulator...");
    const regulatorContract = mediTrustChain.connect(regulator);
    tx = await regulatorContract.registerUser(1, "FDA - Food and Drug Administration");
    await tx.wait();
    console.log("✓ Regulator registered");

    // Grant regulatory approval
    console.log("\nGranting regulatory approval...");
    tx = await mediTrustChain.grantRegulatoryApproval(regulator.address);
    await tx.wait();
    console.log(`✓ Regulatory approval granted to ${regulator.address}`);

    // Register distributor
    console.log("\nRegistering distributor...");
    const distributorContract = mediTrustChain.connect(distributor);
    tx = await distributorContract.registerUser(2, "Global Pharma Distributor");
    await tx.wait();
    console.log("✓ Distributor registered");
  } else {
    console.log("\n⚠️  Only one signer available. Skipping additional user registrations.");
    console.log("💡 You can register additional users manually after deployment.");
  }

  console.log("\n" + "=".repeat(50));
  console.log("Setup Complete!");
  console.log("=".repeat(50));
  console.log(`\nContract Address: ${contractAddress}`);
  console.log(`Owner: ${owner.address}`);
  if (signers.length > 1) {
    console.log(`Regulator: ${signers[1].address}`);
    console.log(`Distributor: ${signers[2].address}`);
  }

  if (network !== "hardhat") {
    console.log("\n⚠️  Save the contract address for later use!");
    console.log(`📝 Add to your .env.local or blockchain/.env:`);
    console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
