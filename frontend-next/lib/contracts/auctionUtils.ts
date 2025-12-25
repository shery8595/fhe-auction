import { ethers } from "ethers";

// Factory address deployed on Ethereum Sepolia (Chain ID: 11155111)
// FHEVM v0.9 - Deployed: 2024-12-24
export const FACTORY_ADDRESS = "0xcC1f9148Bdc1c68364d01691E53eaAdae1Aa879f";
export const EXPECTED_CHAIN_ID = 11155111; // Ethereum Sepolia

// Auction ABI - updated for v0.9
export const AUCTION_ABI = [
    "function placeBid(bytes32 encryptedBid, bytes inputProof) external payable",
    "function endAuction() external",
    "function revealWinner(uint256 decryptedIndex, uint256 decryptedBid, bytes abiEncodedClearValues, bytes decryptionProof) external",
    "function claimRefund() external",
    "function claimPrize() external",
    "function claimPayment() external",
    "function reclaimNFT() external",
    "function depositNFT() external",
    "function setReservePrice(bytes32 encryptedReserve, bytes inputProof) external",

    // View functions - simple returns
    "function seller() external view returns (address)",
    "function winner() external view returns (address)",
    "function minimumBid() external view returns (uint256)",
    "function auctionStartTime() external view returns (uint256)",
    "function auctionEndTime() external view returns (uint256)",
    "function auctionEnded() external view returns (bool)",
    "function winnerRevealed() external view returns (bool)",
    "function revealedWinningBid() external view returns (uint256)",
    "function hasNFT() external view returns (bool)",
    "function nftDeposited() external view returns (bool)",
    "function nftClaimed() external view returns (bool)",
    "function hasReservePrice() external view returns (bool)",
    "function reserveMet() external view returns (bool)",
    "function getEncryptedWinningBid() external view returns (uint256)",
    "function getEncryptedWinnerIndex() external view returns (uint256)",
    "function isActive() external view returns (bool)",
    "function getTimeRemaining() external view returns (uint256)",
    "function canClaimRefund(address user) external view returns (bool)",
    "function canClaimPrize(address user) external view returns (bool)",
    "function canClaimPayment() external view returns (bool)",
    "function canReclaimNFT() external view returns (bool)",

    // View functions - struct returns
    "function getAuctionMetadata() external view returns (string title, string description, address auctionSeller, uint256 minBid)",
    "function getAuctionState() external view returns (uint8 aStatus, uint256 startTime, uint256 endTime, bool ended, uint256 bidderCount)",
    "function getNFTInfo() external view returns (bool isNFTAuction, address nftContractAddress, uint256 tokenId, bool claimed)",
    "function getWinnerInfo() external view returns (address winnerAddress, uint256 winningBidAmount, bool isRevealed)",
    "function getPrivacyInfo() external view returns (bool hasReserve, bool isReserveMet, bool bidderCountHidden)",
    "function getStatistics() external view returns (uint256 totalVolume, uint256 avgBid, bool isRevealed)",
    "function bids(address) external view returns (bool exists, uint256 escrowAmount)",

    // Events
    "event BidPlaced(address indexed bidder, uint256 escrowAmount, uint256 timestamp)",
    "event AuctionEnded(uint256 timestamp)",
    "event WinnerRevealed(address indexed winner, uint256 winningBid)",
    "event RefundClaimed(address indexed bidder, uint256 amount)",
    "event PrizeClaimed(address indexed winner, address indexed nftContract, uint256 tokenId)",
    "event PaymentClaimed(address indexed seller, uint256 amount)",
    "event NFTDeposited(address indexed seller, address indexed nftContract, uint256 tokenId)",
];

/**
 * Format time remaining in human-readable format
 */
export function getTimeRemaining(endTime: number): string {
    const now = Math.floor(Date.now() / 1000);
    let diff = endTime - now;

    if (diff <= 0) return "Ended";

    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);

    if (h > 24) {
        return `${Math.floor(h / 24)}d ${h % 24}h`;
    }
    return `${h}h ${m}m`;
}

/**
 * Format wei to ETH
 */
export function formatEth(wei: bigint): string {
    return ethers.formatEther(wei);
}
