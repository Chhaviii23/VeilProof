// VeilProof commitment registry - Hardhat configuration.
// Local chain works offline. Amoy requires RPC_URL + RELAYER_KEY_FILE (never committed).
require("@nomicfoundation/hardhat-toolbox");
const fs = require("fs");

function relayerKey() {
  const file = process.env.RELAYER_KEY_FILE;
  if (!file || !fs.existsSync(file)) return [];
  return [fs.readFileSync(file, "utf8").trim()];
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: { chainId: 31337 },
    amoy: {
      url: process.env.RPC_URL || "",
      chainId: 80002,
      accounts: relayerKey(),
    },
  },
};
