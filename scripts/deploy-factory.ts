import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    console.log("=".repeat(50));
    console.log("🏭 AuctionFactory Deployment");
    console.log("=".repeat(50));
    console.log(`Network: ${network.name} (Chain ID: ${chainId})`);

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
        console.error("\n❌ No ETH in wallet! Get testnet ETH first.");
        console.log("   Sepolia: https://sepoliafaucet.com/");
        console.log("   Zama: https://faucet.zama.ai/");
        return;
    }

    console.log("\nDeploying AuctionFactory...");
    const Factory = await ethers.getContractFactory("AuctionFactory");
    const factory = await Factory.deploy();

    console.log("Waiting for confirmation...");
    await factory.waitForDeployment();

    const factoryAddress = await factory.getAddress();
    console.log(`\n✅ AuctionFactory deployed to: ${factoryAddress}`);

    // Determine network config
    let rpcUrl = "";
    if (chainId === 11155111) {
        rpcUrl = "https://sepolia.infura.io/v3/YOUR_INFURA_KEY";
    } else if (chainId === 8009) {
        rpcUrl = "https://devnet.zama.ai";
    } else {
        rpcUrl = "http://localhost:8545";
    }

    // Update frontend config
    const configPath = path.join(__dirname, "../frontend/src/config.js");

    if (fs.existsSync(configPath)) {
        let configContent = fs.readFileSync(configPath, "utf8");

        // Update FACTORY_ADDRESS
        configContent = configContent.replace(
            /export const FACTORY_ADDRESS = .+;/,
            `export const FACTORY_ADDRESS = "${factoryAddress}";`
        );

        fs.writeFileSync(configPath, configContent);
        console.log(`\n📁 Updated FACTORY_ADDRESS in: ${configPath}`);
    } else {
        // Create new config file
        const newConfig = `// Auto-generated deployment config - ${new Date().toISOString()}
export const CONTARCT_ADDRESS = "";
export const NETWORK_ID = ${chainId};
export const RPC_URL = "${rpcUrl}";

// Factory address for AuctionFactory contract
export const FACTORY_ADDRESS = "${factoryAddress}";
`;
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
        fs.writeFileSync(configPath, newConfig);
        console.log(`\n📁 Created config file: ${configPath}`);
    }

    console.log("\n" + "=".repeat(50));
    console.log("🎉 FACTORY DEPLOYMENT COMPLETE!");
    console.log("=".repeat(50));
    console.log(`\nFactory Address: ${factoryAddress}`);
    console.log(`Network: ${network.name} (${chainId})`);
    console.log("\n📋 Next steps:");
    console.log("1. Users can submit auction requests via the frontend");
    console.log("2. Admins can approve/reject requests");
    console.log("3. Approved auctions are automatically deployed");
    console.log("\n🧪 Test the factory:");
    console.log(`   npx hardhat test test/AuctionFactory.test.ts --network ${network.name}`);
}

main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
});
