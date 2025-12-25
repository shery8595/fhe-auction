/**
 * Factory Context - Interaction with AuctionFactory contract
 * Handles auction submission, approval, and querying
 */

import { ethers } from 'ethers';

// Will be populated after deployment
let FACTORY_ADDRESS = null;

// AuctionFactory ABI
export const FACTORY_ABI = [
    // Submit requests (with NFT support)
    "function submitAuctionRequest(string _title, string _description, uint8 _auctionType, uint256 _durationMinutes, uint256 _minimumBid, address _nftContract, uint256 _nftTokenId) external returns (uint256)",
    "function submitDutchRequest(string _title, string _description, uint256 _durationMinutes, uint256 _startingPrice, uint256 _reservePrice, uint256 _priceDecrement, uint256 _decrementInterval, address _nftContract, uint256 _nftTokenId) external returns (uint256)",

    // Admin actions (lightweight factory uses registerAuction)
    "function registerAuction(uint256 requestId, address auctionAddress) external",
    "function rejectRequest(uint256 requestId) external",

    // View functions
    "function getRequestCount() external view returns (uint256)",
    "function getPendingRequests() external view returns (uint256[])",
    "function getDeployedAuctions() external view returns (address[])",
    "function getActiveAuctions() external view returns (address[])",
    "function getAuctionsBySeller(address seller) external view returns (address[])",
    "function getRequestsBySeller(address seller) external view returns (uint256[])",
    "function getRequest(uint256 requestId) external view returns (address seller, string title, string description, uint8 auctionType, uint256 durationMinutes, uint256 minimumBid, uint8 status, address deployedAuction, uint256 createdAt)",
    "function getDutchRequestDetails(uint256 requestId) external view returns (uint256 startingPrice, uint256 reservePrice, uint256 priceDecrement, uint256 decrementInterval)",
    "function getNFTRequestDetails(uint256 requestId) external view returns (address nftContract, uint256 nftTokenId)",

    // Events
    "event AuctionRequested(uint256 indexed requestId, address indexed seller, uint8 auctionType, string title)",
    "event AuctionApproved(uint256 indexed requestId, address indexed auction, uint8 auctionType)",
    "event AuctionRejected(uint256 indexed requestId)"
];

// Base Auction ABI (shared by all auction types)
export const BASE_AUCTION_ABI = [
    "function getAuctionMetadata() external view returns (string title, string description, address seller, uint8 auctionType, uint256 minBid)",
    "function getAuctionState() external view returns (uint8 status, uint256 startTime, uint256 endTime, bool ended, uint256 bidderCount)",
    "function getWinnerInfo() external view returns (address winner, uint256 winningBid, bool isRevealed)",
    "function getNFTInfo() external view returns (bool isNFTAuction, address nftContractAddress, uint256 tokenId, bool claimed)",
    "function isActive() external view returns (bool)",
    "function getTimeRemaining() external view returns (uint256)",
    "function placeBid(bytes32 encryptedBid, bytes inputProof) external payable",
    "function endAuction() external",
    "function claimRefund() external",
    "function sellerClaimWinnings() external",
    "function requestResultAccess() external",
    "function revealWinner(uint256 decryptedIndex, uint256 decryptedBid, bytes proof) external",

    // NFT deposit functions
    "function depositNFT() external",
    "function isReadyForBidding() external view returns (bool ready, string reason)",
    "function hasNFT() external view returns (bool)",
    "function nftDeposited() external view returns (bool)",
    "function nftContract() external view returns (address)",
    "function nftTokenId() external view returns (uint256)",
    "function seller() external view returns (address)",

    // Bid info functions
    "function bids(address bidder) external view returns (bytes32 encryptedAmount, uint256 escrowAmount, bool exists)",
    "function canClaimRefund(address bidder) external view returns (bool, uint256)",
    "function sellerClaimed() external view returns (bool)",

    // FHE Privacy Features
    "function getPrivacyInfo() external view returns (bool hasReserve, bool isReserveMet, bool bidderCountHidden)",
    "function setReservePrice(bytes32 encryptedReserve, bytes calldata inputProof) external",
    "function hasReservePrice() external view returns (bool)",
    "function reserveMet() external view returns (bool)",

    // Events
    "event BidPlaced(address indexed bidder, uint256 escrowAmount, uint256 timestamp)",
    "event AuctionEnded(uint256 timestamp)",
    "event WinnerRevealed(address indexed winner, uint256 winningBid)",
    "event NFTDeposited(address indexed seller, address indexed nftContract, uint256 tokenId)",
    "event ReserveNotMet(uint256 timestamp)"
];

// Dutch Auction specific ABI
export const DUTCH_AUCTION_ABI = [
    ...BASE_AUCTION_ABI,
    "function getCurrentPrice() external view returns (uint256)",
    "function getDutchInfo() external view returns (uint256 currentPrice, uint256 starting, uint256 reserve, uint256 decrement, uint256 interval, bool hasWinner)",
    "function getTimeToNextDrop() external view returns (uint256)"
];

// Sealed auction specific ABI (First-Price and Vickrey)
export const SEALED_AUCTION_ABI = [
    ...BASE_AUCTION_ABI,
    "function getEncryptedWinningBid() external view returns (bytes32)",
    "function getEncryptedWinnerIndex() external view returns (bytes32)",
    "function getMyBid() external view returns (bytes32)"
];

// Vickrey specific
export const VICKREY_AUCTION_ABI = [
    ...SEALED_AUCTION_ABI,
    "function getEncryptedSecondBid() external view returns (bytes32)",
    "function getVickreyInfo() external view returns (bool isEnded, bool isRevealed, address winner, uint256 paymentAmount)"
];

// Auction types
export const AUCTION_TYPES = {
    FIRST_PRICE: 0,
    VICKREY: 1,
    DUTCH: 2
};

export const AUCTION_TYPE_NAMES = ['First-Price', 'Vickrey', 'Dutch'];

// Request statuses
export const REQUEST_STATUS = {
    PENDING: 0,
    APPROVED: 1,
    REJECTED: 2
};

export const REQUEST_STATUS_NAMES = ['Pending', 'Approved', 'Rejected'];

// Factory singleton
let factoryContract = null;

/**
 * Set the factory address (call this after deployment)
 */
export function setFactoryAddress(address) {
    FACTORY_ADDRESS = address;
    factoryContract = null; // Reset contract instance
}

/**
 * Get factory address
 */
export function getFactoryAddress() {
    return FACTORY_ADDRESS;
}

/**
 * Get factory contract instance
 */
export function getFactoryContract(signerOrProvider) {
    if (!FACTORY_ADDRESS) {
        throw new Error('Factory address not set. Call setFactoryAddress() first.');
    }
    return new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signerOrProvider);
}

/**
 * Get auction contract instance with appropriate ABI based on type
 */
export function getAuctionContract(address, auctionType, signerOrProvider) {
    let abi;
    switch (auctionType) {
        case AUCTION_TYPES.DUTCH:
            abi = DUTCH_AUCTION_ABI;
            break;
        case AUCTION_TYPES.VICKREY:
            abi = VICKREY_AUCTION_ABI;
            break;
        default:
            abi = SEALED_AUCTION_ABI;
    }
    return new ethers.Contract(address, abi, signerOrProvider);
}

// ========================================
// User Functions
// ========================================

/**
 * Submit a standard auction request (First-Price or Vickrey)
 */
export async function submitAuctionRequest(signer, title, description, auctionType, durationMinutes, minimumBid, nftContract = ethers.ZeroAddress, nftTokenId = 0) {
    const factory = getFactoryContract(signer);
    const tx = await factory.submitAuctionRequest(title, description, auctionType, durationMinutes, minimumBid, nftContract, nftTokenId);
    const receipt = await tx.wait();

    // Parse event to get requestId
    const event = receipt.logs.find(log => {
        try {
            return factory.interface.parseLog(log)?.name === 'AuctionRequested';
        } catch { return false; }
    });

    if (event) {
        const parsed = factory.interface.parseLog(event);
        return parsed.args.requestId;
    }

    return null;
}

/**
 * Submit a Dutch auction request
 */
export async function submitDutchRequest(signer, title, description, durationMinutes, startingPrice, reservePrice, priceDecrement, decrementInterval, nftContract = ethers.ZeroAddress, nftTokenId = 0) {
    const factory = getFactoryContract(signer);
    const tx = await factory.submitDutchRequest(
        title,
        description,
        durationMinutes,
        startingPrice,
        reservePrice,
        priceDecrement,
        decrementInterval,
        nftContract,
        nftTokenId
    );
    const receipt = await tx.wait();

    const event = receipt.logs.find(log => {
        try {
            return factory.interface.parseLog(log)?.name === 'AuctionRequested';
        } catch { return false; }
    });

    if (event) {
        const parsed = factory.interface.parseLog(event);
        return parsed.args.requestId;
    }

    return null;
}

// ========================================
// Admin Functions
// ========================================

/**
 * Register an externally deployed auction for a pending request
 * Note: The lightweight factory requires auctions to be deployed separately
 */
export async function registerAuction(signer, requestId, auctionAddress) {
    const factory = getFactoryContract(signer);
    const tx = await factory.registerAuction(requestId, auctionAddress);
    return await tx.wait();
}

/**
 * Reject a pending request
 */
export async function rejectRequest(signer, requestId) {
    const factory = getFactoryContract(signer);
    const tx = await factory.rejectRequest(requestId);
    return await tx.wait();
}

// ========================================
// Query Functions
// ========================================

/**
 * Get all pending request IDs
 */
export async function getPendingRequests(provider) {
    const factory = getFactoryContract(provider);
    return await factory.getPendingRequests();
}

/**
 * Get request details
 */
export async function getRequest(provider, requestId) {
    const factory = getFactoryContract(provider);
    const [seller, title, description, auctionType, durationMinutes, minimumBid, status, deployedAuction, createdAt] =
        await factory.getRequest(requestId);

    return {
        id: requestId,
        seller,
        title,
        description,
        auctionType: Number(auctionType),
        durationMinutes: Number(durationMinutes),
        minimumBid: minimumBid,
        status: Number(status),
        deployedAuction,
        createdAt: Number(createdAt)
    };
}

/**
 * Get Dutch-specific request details
 */
export async function getDutchRequestDetails(provider, requestId) {
    const factory = getFactoryContract(provider);
    const [startingPrice, reservePrice, priceDecrement, decrementInterval] =
        await factory.getDutchRequestDetails(requestId);

    return {
        startingPrice,
        reservePrice,
        priceDecrement,
        decrementInterval: Number(decrementInterval)
    };
}

/**
 * Get all deployed auction addresses
 */
export async function getDeployedAuctions(provider) {
    const factory = getFactoryContract(provider);
    return await factory.getDeployedAuctions();
}

/**
 * Get active auction addresses
 */
export async function getActiveAuctions(provider) {
    const factory = getFactoryContract(provider);
    return await factory.getActiveAuctions();
}

/**
 * Get auction info for a deployed auction
 */
export async function getAuctionInfo(provider, auctionAddress) {
    // First get metadata to determine type
    const baseContract = new ethers.Contract(auctionAddress, BASE_AUCTION_ABI, provider);
    const [title, description, seller, auctionType, minBid] = await baseContract.getAuctionMetadata();
    const [status, startTime, endTime, ended, bidderCount] = await baseContract.getAuctionState();
    const isActive = await baseContract.isActive();

    // Check NFT status
    let hasNFT = false;
    let nftDeposited = true; // Default true for non-NFT auctions
    let nftContractAddress = null;
    let nftTokenId = null;

    try {
        hasNFT = await baseContract.hasNFT();
        if (hasNFT) {
            nftDeposited = await baseContract.nftDeposited();
            // Get NFT contract and tokenId for image display
            const [isNFT, nftAddr, tokenId, claimed] = await baseContract.getNFTInfo();
            nftContractAddress = nftAddr;
            nftTokenId = tokenId.toString();
        }
    } catch (e) {
        // Old contracts may not have these functions
    }

    return {
        address: auctionAddress,
        title,
        description,
        seller,
        auctionType: Number(auctionType),
        minimumBid: minBid,
        status: Number(status),
        startTime: Number(startTime),
        endTime: Number(endTime),
        ended,
        bidderCount: Number(bidderCount),
        isActive,
        hasNFT,
        nftDeposited,
        nftContractAddress,
        nftTokenId,
        // Auction is ready for public if not an NFT auction OR if NFT is deposited
        isReadyForPublic: !hasNFT || nftDeposited
    };
}

/**
 * Get total request count
 */
export async function getRequestCount(provider) {
    const factory = getFactoryContract(provider);
    return await factory.getRequestCount();
}
