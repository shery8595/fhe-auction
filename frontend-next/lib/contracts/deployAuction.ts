/**
 * Deploy auction contracts directly from the browser
 */

import { ethers } from "ethers";
import { CONTRACTS } from "./contractsBytecode";

/**
 * Deploy a First-Price auction contract from the browser
 * (v0.9 only supports First-Price auctions)
 */
export async function deployAuctionContract(
    signer: ethers.Signer,
    title: string,
    description: string,
    durationMinutes: number,
    minimumBid: bigint,
    sellerAddress: string,
    nftContract: string,
    nftTokenId: bigint
): Promise<string> {
    // v0.9 only supports First-Price auctions
    const factory = new ethers.ContractFactory(
        CONTRACTS.firstPrice.abi,
        CONTRACTS.firstPrice.bytecode,
        signer
    );

    const deployArgs = [
        title,
        description,
        durationMinutes,
        minimumBid,
        sellerAddress,
        nftContract,
        nftTokenId
    ];

    console.log("Deploying First-Price auction with args:", deployArgs);

    const auction = await factory.deploy(...deployArgs);

    console.log("Waiting for deployment...");
    await auction.waitForDeployment();

    const auctionAddress = await auction.getAddress();
    console.log("✅ Auction deployed to:", auctionAddress);

    return auctionAddress;
}
