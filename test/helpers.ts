import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * Test Helpers for FHE Auction Contracts
 * Uses the FHEVM Hardhat plugin for local FHE testing
 */

// ========================================
// Time Manipulation Helpers
// ========================================

export async function advanceTime(seconds: number): Promise<void> {
    await time.increase(seconds);
}

export async function advanceTimeTo(timestamp: number): Promise<void> {
    await time.increaseTo(timestamp);
}

export async function getCurrentTimestamp(): Promise<number> {
    const block = await ethers.provider.getBlock("latest");
    return block?.timestamp ?? 0;
}

export async function advanceTimeByMinutes(minutes: number): Promise<void> {
    await advanceTime(minutes * 60);
}

// ========================================
// Contract Deployment Helpers
// ========================================

export async function deployAuctionFactory() {
    const Factory = await ethers.getContractFactory("AuctionFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    return factory;
}

export async function deployFirstPriceAuction(
    title: string = "Test First Price Auction",
    description: string = "A test auction",
    durationMinutes: number = 60,
    minimumBid: bigint = 100n,
    seller: string,
    nftContract: string = ethers.ZeroAddress,
    nftTokenId: bigint = 0n
) {
    const Auction = await ethers.getContractFactory("FirstPriceAuction");
    const auction = await Auction.deploy(
        title,
        description,
        durationMinutes,
        minimumBid,
        seller,
        nftContract,
        nftTokenId
    );
    await auction.waitForDeployment();
    return auction;
}

export async function deployVickreyAuction(
    title: string = "Test Vickrey Auction",
    description: string = "A test second-price auction",
    durationMinutes: number = 60,
    minimumBid: bigint = 100n,
    seller: string,
    nftContract: string = ethers.ZeroAddress,
    nftTokenId: bigint = 0n
) {
    const Auction = await ethers.getContractFactory("VickreyAuction");
    const auction = await Auction.deploy(
        title,
        description,
        durationMinutes,
        minimumBid,
        seller,
        nftContract,
        nftTokenId
    );
    await auction.waitForDeployment();
    return auction;
}

export async function deployDutchAuction(
    title: string = "Test Dutch Auction",
    description: string = "A test descending price auction",
    durationMinutes: number = 60,
    startingPrice: bigint = 1000n,
    reservePrice: bigint = 100n,
    priceDecrement: bigint = 50n,
    decrementIntervalSeconds: number = 60,
    seller: string,
    nftContract: string = ethers.ZeroAddress,
    nftTokenId: bigint = 0n
) {
    const Auction = await ethers.getContractFactory("DutchAuction");
    const auction = await Auction.deploy(
        title,
        description,
        durationMinutes,
        startingPrice,
        reservePrice,
        priceDecrement,
        decrementIntervalSeconds,
        seller,
        nftContract,
        nftTokenId
    );
    await auction.waitForDeployment();
    return auction;
}

// ========================================
// FHE Encryption Helpers (using plugin)
// ========================================

/**
 * Create an encrypted bid using the FHEVM Hardhat plugin
 * This uses the plugin's local FHE mock for testing
 */
export async function createEncryptedBid(
    contractAddress: string,
    userAddress: string,
    bidAmount: number
) {
    const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, userAddress)
        .add32(bidAmount)
        .encrypt();

    return {
        handle: encryptedInput.handles[0],
        proof: encryptedInput.inputProof,
    };
}

/**
 * Create an encrypted uint8 value (for vote-like inputs)
 */
export async function createEncryptedUint8(
    contractAddress: string,
    userAddress: string,
    value: number
) {
    const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, userAddress)
        .add8(value)
        .encrypt();

    return {
        handle: encryptedInput.handles[0],
        proof: encryptedInput.inputProof,
    };
}

/**
 * Decrypt handles using the plugin's public decrypt
 */
export async function decryptHandles(handles: `0x${string}`[]) {
    return await fhevm.publicDecrypt(handles);
}

// ========================================
// Account Helpers
// ========================================

export async function getTestAccounts() {
    const [deployer, seller, bidder1, bidder2, bidder3, admin] = await ethers.getSigners();
    return {
        deployer,
        seller,
        bidder1,
        bidder2,
        bidder3,
        admin,
    };
}

// ========================================
// Constants
// ========================================

export const AUCTION_STATUS = {
    PENDING: 0,
    APPROVED: 1,
    REJECTED: 2,
};

export const AUCTION_TYPE = {
    FIRST_PRICE: 0,
    VICKREY: 1,
    DUTCH: 2,
};

export const REQUEST_STATUS = {
    PENDING: 0,
    APPROVED: 1,
    REJECTED: 2,
};

// Default test values
export const DEFAULT_DURATION_MINUTES = 60;
export const DEFAULT_MINIMUM_BID = 100n;
export const DEFAULT_STARTING_PRICE = 1000n;
export const DEFAULT_RESERVE_PRICE = 100n;
export const DEFAULT_PRICE_DECREMENT = 50n;
export const DEFAULT_DECREMENT_INTERVAL = 60;

// Re-export fhevm for use in test files
export { fhevm };
