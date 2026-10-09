// Deploys CommitmentRegistry and writes a NON-SECRET deployment manifest.
// Usage (local):  npx hardhat run scripts/deploy.js --network hardhat
// Usage (Amoy):   RPC_URL=... RELAYER_KEY_FILE=... npx hardhat run scripts/deploy.js --network amoy
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const Factory = await hre.ethers.getContractFactory("CommitmentRegistry");
  const contract = await Factory.deploy(deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const network = await hre.ethers.provider.getNetwork();
  const manifest = {
    contract: "CommitmentRegistry",
    version: 1,
    network: hre.network.name,
    chainId: Number(network.chainId),
    address,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };
  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, `commitment-registry.${hre.network.name}.json`),
    JSON.stringify(manifest, null, 2)
  );
  // Print only non-secret values.
  console.log(JSON.stringify(manifest));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
