import { ethers } from "hardhat";

/**
 * Deploy a FirstPriceAuction for a pending request
 * Usage: npx hardhat run scripts/deploy-firstprice.ts --network sepolia
 */
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying FirstPriceAuction with:", deployer.address);

    // Auction parameters - customize these
    const title = "First-Price FHE Auction";
    const description = "A sealed-bid auction with encrypted bids";
    const durationMinutes = 60; // 1 hour
    const minimumBid = 100; // 100 wei minimum
    const seller = deployer.address; // Seller is deployer

    console.log("\nParameters:");
    console.log("- Title:", title);
    console.log("- Duration:", durationMinutes, "minutes");
    console.log("- Minimum Bid:", minimumBid, "wei");
    console.log("- Seller:", seller);

    const Factory = await ethers.getContractFactory("FirstPriceAuction");
    const auction = await Factory.deploy(
        title,
        description,
        durationMinutes,
        minimumBid,
        seller,
        ethers.ZeroAddress, // No NFT contract
        0 // No NFT token ID
    );

    await auction.waitForDeployment();
    const address = await auction.getAddress();

    console.log("\n✅ FirstPriceAuction deployed to:", address);
    console.log("\n📋 Next: Register with factory using:");
    console.log(`   factory.registerAuction(requestId, "${address}")`);
}

main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
});
