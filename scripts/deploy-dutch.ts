import { ethers } from "hardhat";

/**
 * Deploy a DutchAuction for a pending request
 * Usage: npx hardhat run scripts/deploy-dutch.ts --network sepolia
 */
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying DutchAuction with:", deployer.address);

    // Auction parameters - customize these
    const title = "Dutch Auction";
    const description = "Price decreases over time - first bidder wins";
    const durationMinutes = 60; // 1 hour
    const startingPrice = 10000; // Start at 10000 wei
    const reservePrice = 1000; // Floor at 1000 wei
    const priceDecrement = 100; // Drop 100 wei each interval
    const decrementIntervalSeconds = 60; // Drop every 60 seconds
    const seller = deployer.address;

    console.log("\nParameters:");
    console.log("- Title:", title);
    console.log("- Duration:", durationMinutes, "minutes");
    console.log("- Starting Price:", startingPrice, "wei");
    console.log("- Reserve Price:", reservePrice, "wei");
    console.log("- Price Decrement:", priceDecrement, "wei every", decrementIntervalSeconds, "seconds");
    console.log("- Seller:", seller);

    const Factory = await ethers.getContractFactory("DutchAuction");
    const auction = await Factory.deploy(
        title,
        description,
        durationMinutes,
        startingPrice,
        reservePrice,
        priceDecrement,
        decrementIntervalSeconds,
        seller,
        ethers.ZeroAddress, // No NFT contract
        0 // No NFT token ID
    );

    await auction.waitForDeployment();
    const address = await auction.getAddress();

    console.log("\n✅ DutchAuction deployed to:", address);
    console.log("\n📋 Next: Register with factory using:");
    console.log(`   factory.registerAuction(requestId, "${address}")`);
}

main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
});
