/**
 * Factory Utils - Contract interaction utilities for AuctionFactory
 * FHEVM v0.9 Compatible
 */

import { ethers } from "ethers";

// Factory address on Sepolia - FHEVM v0.9
export const FACTORY_ADDRESS = "0xcC1f9148Bdc1c68364d01691E53eaAdae1Aa879f";
export const FACTORY_ABI = [
    // Submit requests (with NFT support)
    "function submitAuctionRequest(string _title, string _description, uint256 _durationMinutes, uint256 _minimumBid, address _nftContract, uint256 _nftTokenId) external returns (uint256)",

    // Admin actions
    "function registerAuction(uint256 requestId, address auctionAddress) external",
    "function rejectRequest(uint256 requestId) external",

    // View functions
    "function getRequestCount() external view returns (uint256)",
    "function getPendingRequests() external view returns (uint256[])",
    "function getDeployedAuctions() external view returns (address[])",
    "function getRequestsBySeller(address seller) external view returns (uint256[])",
    "function getRequest(uint256 requestId) external view returns (address seller, string title, string description, uint256 durationMinutes, uint256 minimumBid, uint8 status, address deployedAuction, uint256 createdAt)",
    "function getNFTRequestDetails(uint256 requestId) external view returns (address nftContract, uint256 nftTokenId)",

    // Events
    "event AuctionRequested(uint256 indexed requestId, address indexed seller, string title)",
    "event AuctionApproved(uint256 indexed requestId, address indexed auction)",
    "event AuctionRejected(uint256 indexed requestId)",
];

// Base Auction ABI for interacting with deployed auctions
export const BASE_AUCTION_ABI = [
    // View functions
    "function getAuctionMetadata() external view returns (string title, string description, address auctionSeller, uint256 minBid)",
    "function getAuctionState() external view returns (uint8 aStatus, uint256 startTime, uint256 endTime, bool ended, uint256 bidderCount)",
    "function getNFTInfo() external view returns (bool isNFTAuction, address nftContractAddress, uint256 tokenId, bool claimed)",
    "function isActive() external view returns (bool)",
    "function getTimeRemaining() external view returns (uint256)",
    "function nftDeposited() external view returns (bool)",
    "function seller() external view returns (address)",
    "function minimumBid() external view returns (uint256)",
    "function bids(address) external view returns (uint256 encryptedAmount, uint256 escrowAmount, bool exists)",
    "function getWinnerInfo() external view returns (address winnerAddress, uint256 winningBidAmount, bool isRevealed)",
    "function sellerClaimed() external view returns (bool)",
    "function winnerRevealed() external view returns (bool)",
    "function winner() external view returns (address)",
    "function reserveMet() external view returns (bool)",
    "function hasReservePrice() external view returns (bool)",
    "function refundClaimed(address) external view returns (bool)",
    "function canClaimRefund(address user) external view returns (bool)",
    "function canClaimPrize(address user) external view returns (bool)",
    "function canClaimPayment() external view returns (bool)",
    "function canReclaimNFT() external view returns (bool)",
    "function bidders(uint256 index) external view returns (address)",

    // Bid placement
    "function placeBid(bytes32 encryptedBid, bytes inputProof) external payable",

    // NFT deposit
    "function depositNFT() external",

    // Claim functions
    "function claimRefund() external",
    "function claimPrize() external",
    "function claimPayment() external",
    "function reclaimNFT() external",

    // Auction management
    "function endAuction() external",
    "function revealWinner(uint256 decryptedIndex, uint256 decryptedBid, bytes calldata proof) external",

    // Events
    "event BidPlaced(address indexed bidder, uint256 escrowAmount, uint256 timestamp)",
    "event RefundClaimed(address indexed bidder, uint256 amount)",
    "event PrizeClaimed(address indexed winner, address indexed nftContract, uint256 tokenId)",
    "event PaymentClaimed(address indexed seller, uint256 amount)",
    "event NFTReclaimed(address indexed seller, address indexed nftContract, uint256 tokenId)",
];

/**
 * Submit a standard auction request (First-Price sealed-bid)
 */
export async function submitAuctionRequest(
    signer: ethers.Signer,
    factoryAddress: string,
    title: string,
    description: string,
    durationMinutes: number,
    minimumBid: string,
    nftContract: string = ethers.ZeroAddress,
    nftTokenId: bigint = BigInt(0)
): Promise<number> {
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, signer);

    const minimumBidWei = ethers.parseEther(minimumBid);

    console.log("Submitting auction request:", {
        title,
        durationMinutes,
        minimumBid: minimumBidWei.toString(),
        nftContract,
        nftTokenId: nftTokenId.toString(),
    });

    const tx = await factory.submitAuctionRequest(
        title,
        description,
        durationMinutes,
        minimumBidWei,
        nftContract,
        nftTokenId
    );

    const receipt = await tx.wait();

    // Parse the AuctionRequested event to get the request ID
    const event = receipt.logs
        .map((log: any) => {
            try {
                return factory.interface.parseLog(log);
            } catch {
                return null;
            }
        })
        .find((e: any) => e && e.name === "AuctionRequested");

    if (!event) {
        throw new Error("AuctionRequested event not found");
    }

    const requestId = Number(event.args.requestId);
    console.log("✅ Auction request submitted! Request ID:", requestId);

    return requestId;
}


/**
 * Get user's auction requests
 */
export async function getUserRequests(
    provider: ethers.Provider,
    factoryAddress: string,
    userAddress: string
): Promise<number[]> {
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
    const requestIds = await factory.getRequestsBySeller(userAddress);
    return requestIds.map((id: bigint) => Number(id));
}

/**
 * Get all pending auction requests (admin function)
 */
export async function getPendingRequests(
    provider: ethers.Provider,
    factoryAddress: string
): Promise<number[]> {
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
    const requestIds = await factory.getPendingRequests();
    return requestIds.map((id: bigint) => Number(id));
}

/**
 * Get detailed information about a specific request
 */
export async function getRequestDetails(
    provider: ethers.Provider,
    factoryAddress: string,
    requestId: number
) {
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);

    // Get basic request info
    const request = await factory.getRequest(requestId);

    const details: any = {
        requestId,
        seller: request.seller,
        title: request.title,
        description: request.description,
        durationMinutes: Number(request.durationMinutes),
        minimumBid: request.minimumBid,
        status: Number(request.status),
        deployedAuction: request.deployedAuction,
        createdAt: Number(request.createdAt),
    };

    // Get NFT details
    const nftDetails = await factory.getNFTRequestDetails(requestId);
    details.nftContract = nftDetails.nftContract;
    details.nftTokenId = nftDetails.nftTokenId;
    details.hasNFT = nftDetails.nftContract !== ethers.ZeroAddress;

    return details;
}

/**
 * Register an auction (admin approves and provides deployed address)
 */
export async function registerAuction(
    signer: ethers.Signer,
    factoryAddress: string,
    requestId: number,
    auctionAddress: string
): Promise<void> {
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, signer);

    console.log("Registering auction:", { requestId, auctionAddress });

    const tx = await factory.registerAuction(requestId, auctionAddress);
    await tx.wait();

    console.log("✅ Auction registered successfully!");
}

/**
 * Reject an auction request (admin function)
 */
export async function rejectRequest(
    signer: ethers.Signer,
    factoryAddress: string,
    requestId: number
): Promise<void> {
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, signer);

    console.log("Rejecting request:", requestId);

    const tx = await factory.rejectRequest(requestId);
    await tx.wait();

    console.log("✅ Request rejected successfully!");
}

/**
 * Get all auction requests for a specific user
 */
export async function getUserAuctionRequests(
    provider: ethers.Provider,
    factoryAddress: string,
    userAddress: string
) {
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);

    console.log("📋 Fetching auction requests for:", userAddress);

    const requestIds = await factory.getRequestsBySeller(userAddress);
    console.log("Found request IDs:", requestIds);

    const requests = [];

    for (const id of requestIds) {
        try {
            const details = await getRequestDetails(provider, factoryAddress, Number(id));
            requests.push({
                requestId: Number(id),
                ...details
            });
        } catch (error) {
            console.error(`Error fetching request ${id}:`, error);
        }
    }

    return requests;
}

/**
 * Categorize user's auction requests by status
 */
export async function categorizeUserRequests(
    provider: ethers.Provider,
    factoryAddress: string,
    userAddress: string
) {
    const requests = await getUserAuctionRequests(provider, factoryAddress, userAddress);

    const categorized = {
        pending: [] as any[],
        approved: [] as any[],
        active: [] as any[],
        rejected: [] as any[]
    };

    for (const request of requests) {
        if (request.status === 2) {
            // Rejected
            categorized.rejected.push(request);
        } else if (request.status === 1 && request.deployedAuction !== ethers.ZeroAddress) {
            // Approved - check if NFT is deposited (active) or needs approval
            if (request.hasNFT) {
                try {
                    const auction = new ethers.Contract(
                        request.deployedAuction,
                        BASE_AUCTION_ABI,
                        provider
                    );
                    const nftDeposited = await auction.nftDeposited();

                    if (nftDeposited) {
                        categorized.active.push(request);
                    } else {
                        categorized.approved.push(request);
                    }
                } catch (error) {
                    console.error("Error checking NFT deposit status:", error);
                    categorized.approved.push(request);
                }
            } else {
                // No NFT, auction is active immediately
                categorized.active.push(request);
            }
        } else if (request.status === 0) {
            // Pending
            categorized.pending.push(request);
        }
    }

    console.log("📊 Categorized requests:", {
        pending: categorized.pending.length,
        approved: categorized.approved.length,
        active: categorized.active.length,
        rejected: categorized.rejected.length
    });

    return categorized;
}

/**
 * Check if NFT is approved for auction contract
 */
export async function checkNFTApproval(
    provider: ethers.Provider,
    nftContract: string,
    tokenId: string,
    auctionAddress: string
): Promise<boolean> {
    const ERC721_ABI = [
        "function getApproved(uint256 tokenId) external view returns (address)",
        "function ownerOf(uint256 tokenId) external view returns (address)",
        "function isApprovedForAll(address owner, address operator) external view returns (bool)"
    ];

    const nft = new ethers.Contract(nftContract, ERC721_ABI, provider);

    try {
        const approved = await nft.getApproved(tokenId);
        if (approved.toLowerCase() === auctionAddress.toLowerCase()) {
            return true;
        }

        const owner = await nft.ownerOf(tokenId);
        const isApprovedAll = await nft.isApprovedForAll(owner, auctionAddress);
        return isApprovedAll;
    } catch (error) {
        console.error("Error checking NFT approval:", error);
        return false;
    }
}

/**
 * Approve NFT for auction contract
 */
export async function approveNFTForAuction(
    signer: ethers.Signer,
    nftContract: string,
    tokenId: string,
    auctionAddress: string
): Promise<void> {
    const ERC721_ABI = [
        "function approve(address to, uint256 tokenId) external",
        "function getApproved(uint256 tokenId) external view returns (address)"
    ];

    const nft = new ethers.Contract(nftContract, ERC721_ABI, signer);

    // Check if already approved
    const approved = await nft.getApproved(tokenId);
    if (approved.toLowerCase() === auctionAddress.toLowerCase()) {
        console.log("✅ NFT already approved");
        return;
    }

    console.log("🔐 Approving NFT for auction...");
    const tx = await nft.approve(auctionAddress, tokenId);
    await tx.wait();

    console.log("✅ NFT approved successfully!");
}

