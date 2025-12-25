// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32, ebool, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

// ERC721 Interface for NFT support
interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function transferFrom(address from, address to, uint256 tokenId) external;
    function getApproved(uint256 tokenId) external view returns (address operator);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

/**
 * @title BaseAuction
 * @notice Base contract for all auction types with FHE privacy
 * @dev Abstract contract - child contracts implement specific auction logic
 *      Chainlink Automation is now handled by AuctionFactory, not individual auctions
 */
abstract contract BaseAuction is ZamaEthereumConfig {
    // ========================================
    // Types
    // ========================================
    
    enum AuctionStatus { PENDING, APPROVED, REJECTED }
    
    struct Bid {
        euint32 encryptedAmount;
        uint256 escrowAmount;
        bool exists;
    }
    
    // ========================================
    // State Variables
    // ========================================
    
    // Metadata
    string public auctionTitle;
    string public auctionDescription;
    address public seller;
    address public factory;
    AuctionStatus public status;
    
    
    // NFT Support
    address public nftContract;
    uint256 public nftTokenId;
    bool public hasNFT;
    bool public nftClaimed;
    bool public nftDeposited;  // True after seller deposits NFT
    
    // Timing
    uint256 public auctionStartTime;
    uint256 public auctionEndTime;
    uint256 public auctionDuration; // Stored for NFT auctions (timer starts on deposit)
    uint256 public minimumBid;
    
    // Auction state
    bool public auctionEnded;
    
    // Bid storage
    mapping(address => Bid) public bids;
    address[] public bidders;
    
    // Winner (determined after auction ends)
    address public winner;
    bool public winnerRevealed;
    uint256 public revealedWinningBid;
    
    // Refund tracking
    mapping(address => bool) public refundClaimed;
    bool public sellerClaimed;
    
    // ========================================
    // FHE Privacy Features
    // ========================================
    
    // Private Reserve Price - encrypted minimum that must be met
    euint32 internal encryptedReservePrice;
    bool public hasReservePrice;
    bool public reserveMet;  // Set to true if winning bid >= reserve
    
    // Encrypted Bidder Count - hidden until auction ends
    euint32 internal encryptedBidderCount;
    uint256 public revealedBidderCount; // Only set after auction ends
    
    // ========================================
    // FHE Privacy Feature: Private Statistics
    // ========================================
    
    // Encrypted total bid volume - sum of all bids (HIDDEN during auction)
    euint32 internal encryptedTotalBidVolume;
    uint256 public revealedTotalVolume;      // Only set after auction ends
    bool public statisticsRevealed;
    
    // ========================================
    // Events
    // ========================================
    
    event AuctionApproved(address indexed auction, uint256 timestamp);
    event AuctionRejected(address indexed auction, uint256 timestamp);
    event BidPlaced(address indexed bidder, uint256 escrowAmount, uint256 timestamp);
    event AuctionEnded(uint256 timestamp);
    event WinnerRevealed(address indexed winner, uint256 winningBid);
    event RefundClaimed(address indexed bidder, uint256 amount);
    event PrizeClaimed(address indexed winner, address indexed nftContract, uint256 tokenId);
    event PaymentClaimed(address indexed seller, uint256 amount);
    event NFTReclaimed(address indexed seller, address indexed nftContract, uint256 tokenId);
    event SellerPaid(address indexed seller, uint256 amount);
    event NFTTransferred(address indexed to, address indexed nftContract, uint256 tokenId);
    event NFTDeposited(address indexed seller, address indexed nftContract, uint256 tokenId);
    event ReserveNotMet(uint256 timestamp);  // Emitted when highest bid < reserve price
    event StatisticsRevealed(uint256 totalVolume, uint256 bidderCount);
    
    // ========================================
    // Modifiers
    // ========================================
    
    /**
     * @notice Anyone can act as admin for now (configurable in future)
     * @dev This modifier allows any address to perform admin actions
     */
    modifier onlyAdmin() {
        // For now, everyone is admin. In production, restrict this:
        // require(msg.sender == admin || admins[msg.sender], "Not admin");
        _;
    }
    
    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory can call");
        _;
    }
    
    modifier onlySeller() {
        require(msg.sender == seller, "Only seller can call");
        _;
    }
    
    modifier onlyApproved() {
        require(status == AuctionStatus.APPROVED, "Auction not approved");
        _;
    }
    
    modifier auctionActive() {
        require(status == AuctionStatus.APPROVED, "Auction not approved");
        require(!auctionEnded, "Auction has ended");
        require(block.timestamp >= auctionStartTime, "Auction not started");
        require(block.timestamp < auctionEndTime, "Auction time expired");
        // For NFT auctions, require NFT to be deposited before bidding
        require(!hasNFT || nftDeposited, "NFT not yet deposited by seller");
        _;
    }
    
    modifier auctionEndable() {
        require(status == AuctionStatus.APPROVED, "Auction not approved");
        require(!auctionEnded, "Already ended");
        require(block.timestamp >= auctionEndTime, "Auction still active");
        _;
    }
    
    // ========================================
    // Constructor
    // ========================================
    
    constructor(
        string memory _title,
        string memory _description,
        uint256 _durationInMinutes,
        uint256 _minimumBid,
        address _seller,
        address _nftContract,
        uint256 _nftTokenId
    ) {
        auctionTitle = _title;
        auctionDescription = _description;
        seller = _seller;
        factory = msg.sender; // Deployer becomes factory for permissions
        minimumBid = _minimumBid;
        
        // NFT Support - store info but DON'T transfer yet
        // Seller will deposit after auction is deployed
        if (_nftContract != address(0)) {
            nftContract = _nftContract;
            nftTokenId = _nftTokenId;
            hasNFT = true;
            nftDeposited = false; // Will be set true when seller deposits
            
            // For NFT auctions, store duration and don't start timer yet
            // Timer will start when seller deposits NFT
            auctionDuration = _durationInMinutes * 1 minutes;
            status = AuctionStatus.APPROVED;
            // auctionStartTime and auctionEndTime will be set in depositNFT()
        } else {
            // Non-NFT auction: start immediately
            status = AuctionStatus.APPROVED;
            auctionStartTime = block.timestamp;
            auctionEndTime = block.timestamp + (_durationInMinutes * 1 minutes);
        }
        
        emit AuctionApproved(address(this), block.timestamp);
    }
    
    // ========================================
    // Admin Functions
    // ========================================
    
    /**
     * @notice Approve the auction and start it
     * @dev Can only be called by factory (which checks admin permission)
     */
    function approve() external onlyFactory {
        require(status == AuctionStatus.PENDING, "Not pending");
        
        status = AuctionStatus.APPROVED;
        auctionStartTime = block.timestamp;
        auctionEndTime = block.timestamp + auctionEndTime; // Convert duration to end time
        
        emit AuctionApproved(address(this), block.timestamp);
    }
    
    /**
     * @notice Reject the auction
     */
    function reject() external onlyFactory {
        require(status == AuctionStatus.PENDING, "Not pending");
        
        status = AuctionStatus.REJECTED;
        
        emit AuctionRejected(address(this), block.timestamp);
    }
    
    // ========================================
    // Private Reserve Price (Seller sets encrypted reserve)
    // ========================================
    
    /**
     * @notice Seller sets an encrypted reserve price
     * @dev Can only be called before any bids are placed
     * @param encryptedReserve The encrypted reserve price
     * @param inputProof Zero-knowledge proof for the encrypted value
     */
    function setReservePrice(
        externalEuint32 encryptedReserve,
        bytes calldata inputProof
    ) external onlySeller {
        require(!hasReservePrice, "Reserve price already set");
        require(bidders.length == 0, "Cannot set reserve after bids placed");
        
        euint32 reserve = FHE.fromExternal(encryptedReserve, inputProof);
        _setReservePrice(reserve);
    }
    
    // ========================================
    // NFT Deposit (Seller calls after auction deployed)
    // ========================================
    
    /**
     * @notice Seller deposits their NFT to the auction contract
     * @dev Seller must approve this contract first, then call this function
     */
    function depositNFT() external onlySeller {
        require(hasNFT, "Not an NFT auction");
        require(!nftDeposited, "NFT already deposited");
        require(status == AuctionStatus.APPROVED, "Auction not approved");
        require(!auctionEnded, "Auction already ended");
        
        // Transfer NFT from seller to this contract
        IERC721(nftContract).transferFrom(msg.sender, address(this), nftTokenId);
        nftDeposited = true;
        
        // Start the auction timer NOW
        auctionStartTime = block.timestamp;
        auctionEndTime = block.timestamp + auctionDuration;
        
        emit NFTDeposited(msg.sender, nftContract, nftTokenId);
    }
    
    /**
     * @notice Check if auction is ready for bidding
     * @return ready True if auction can accept bids
     * @return reason Reason if not ready
     */
    function isReadyForBidding() external view returns (bool ready, string memory reason) {
        if (status != AuctionStatus.APPROVED) {
            return (false, "Auction not approved");
        }
        if (auctionEnded) {
            return (false, "Auction ended");
        }
        if (block.timestamp < auctionStartTime) {
            return (false, "Auction not started");
        }
        if (block.timestamp >= auctionEndTime) {
            return (false, "Auction time expired");
        }
        if (hasNFT && !nftDeposited) {
            return (false, "Waiting for seller to deposit NFT");
        }
        return (true, "");
    }
    
    // ========================================
    // View Functions
    // ========================================
    
    /**
     * @notice Get auction metadata
     */
    function getAuctionMetadata() external view returns (
        string memory title,
        string memory description,
        address auctionSeller,
        uint256 minBid
    ) {
        return (
            auctionTitle,
            auctionDescription,
            seller,
            minimumBid
        );
    }
    
    /**
     * @notice Get auction state
     * @dev Bidder count is hidden (returns 0) until auction ends for privacy
     */
    function getAuctionState() external view returns (
        AuctionStatus aStatus,
        uint256 startTime,
        uint256 endTime,
        bool ended,
        uint256 bidderCount
    ) {
        // Hide bidder count until auction ends (privacy feature)
        uint256 visibleBidderCount = auctionEnded ? bidders.length : 0;
        return (
            status,
            auctionStartTime,
            auctionEndTime,
            auctionEnded,
            visibleBidderCount
        );
    }
    
    /**
     * @notice Get privacy info
     */
    function getPrivacyInfo() external view returns (
        bool hasReserve,
        bool isReserveMet,
        bool bidderCountHidden
    ) {
        return (
            hasReservePrice,
            reserveMet,
            !auctionEnded  // Bidder count is hidden while auction is active
        );
    }
    
    /**
     * @notice Get auction statistics (hidden until auction ends and revealed)
     * @return totalVolume The total bid volume (0 if not revealed)
     * @return avgBid The average bid (0 if not revealed)
     * @return isRevealed Whether statistics have been revealed
     */
    function getStatistics() external view returns (
        uint256 totalVolume,
        uint256 avgBid,
        bool isRevealed
    ) {
        if (!statisticsRevealed) {
            return (0, 0, false);
        }
        uint256 avg = bidders.length > 0 ? revealedTotalVolume / bidders.length : 0;
        return (revealedTotalVolume, avg, true);
    }
    
    /**
     * @notice Reveal auction statistics after auction ends
     * @param decryptedTotal The decrypted total bid volume
     * @param proof Decryption proof (for future verification)
     */
    function revealStatistics(
        uint256 decryptedTotal,
        bytes calldata proof
    ) external {
        require(auctionEnded, "Auction not ended");
        require(!statisticsRevealed, "Already revealed");
        
        // In production, verify the decryption proof
        // For now, accept the decrypted value
        proof; // Silence unused warning
        
        revealedTotalVolume = decryptedTotal;
        revealedBidderCount = bidders.length;
        statisticsRevealed = true;
        
        emit StatisticsRevealed(decryptedTotal, bidders.length);
    }
    
    /**
     * @notice Get winner info
     */
    function getWinnerInfo() external view returns (
        address winnerAddress,
        uint256 winningBidAmount,
        bool isRevealed
    ) {
        return (winner, revealedWinningBid, winnerRevealed);
    }
    
    /**
     * @notice Get NFT info if this is an NFT auction
     */
    function getNFTInfo() external view returns (
        bool isNFTAuction,
        address nftContractAddress,
        uint256 tokenId,
        bool claimed
    ) {
        return (hasNFT, nftContract, nftTokenId, nftClaimed);
    }
    
    /**
     * @notice Check if auction is currently active for bidding
     */
    function isActive() external view returns (bool) {
        return status == AuctionStatus.APPROVED &&
               !auctionEnded &&
               block.timestamp >= auctionStartTime &&
               block.timestamp < auctionEndTime;
    }
    
    /**
     * @notice Get time remaining in seconds
     */
    function getTimeRemaining() external view returns (uint256) {
        if (auctionEnded || block.timestamp >= auctionEndTime) {
            return 0;
        }
        return auctionEndTime - block.timestamp;
    }
    
    /**
     * @notice Check if a bidder can claim refund
     */
    
    
    
    
    // ========================================
    // Internal FHE Privacy Helpers
    // ========================================
    
    /**
     * @notice Set the encrypted reserve price (called by child constructor)
     * @param _encryptedReserve The encrypted reserve price
     */
    function _setReservePrice(euint32 _encryptedReserve) internal {
        encryptedReservePrice = _encryptedReserve;
        hasReservePrice = true;
        FHE.allowThis(_encryptedReserve);
    }
    
    /**
     * @notice Increment encrypted bidder count (called when new bidder joins)
     */
    function _incrementBidderCount() internal {
        euint32 one = FHE.asEuint32(1);
        FHE.allowThis(one);
        encryptedBidderCount = FHE.add(encryptedBidderCount, one);
        FHE.allowThis(encryptedBidderCount);
    }
    
    /**
     * @notice Check if winning bid meets reserve (called during reveal)
     * @param encryptedWinningBid The encrypted winning bid to compare
     * @return meetsReserve True if bid >= reserve or no reserve set
     */
    function _checkReserve(euint32 encryptedWinningBid) internal returns (ebool) {
        if (!hasReservePrice) {
            // No reserve price, always meets
            return FHE.asEbool(true);
        }
        // Compare: winningBid >= reserve
        // Since FHE.gte doesn't exist, use: !(bid < reserve) which equals bid >= reserve
        ebool lessThan = FHE.lt(encryptedWinningBid, encryptedReservePrice);
        return FHE.not(lessThan);
    }
    
    /**
     * @notice Update encrypted statistics when a bid is placed
     * @param bidAmount The encrypted bid amount to add to total
     */
    function _updateStatistics(euint32 bidAmount) internal {
        encryptedTotalBidVolume = FHE.add(encryptedTotalBidVolume, bidAmount);
        FHE.allowThis(encryptedTotalBidVolume);
    }
    
    // ========================================
    // Claim Functions (Post-Auction)
    // ========================================
    
    /**
     * @notice Claim refund for losing bidders (or all bidders if reserve not met)
     * @dev Can be called by any bidder after winner is revealed
     */
    function claimRefund() external {
        require(winnerRevealed, "Winner not revealed yet");
        require(bids[msg.sender].exists, "No bid placed");
        require(!refundClaimed[msg.sender], "Refund already claimed");
        
        uint256 refundAmount = bids[msg.sender].escrowAmount;
        require(refundAmount > 0, "No refund available");
        
        // If reserve price not met, EVERYONE gets refund (including winner)
        if (hasReservePrice && !reserveMet) {
            refundClaimed[msg.sender] = true;
            payable(msg.sender).transfer(refundAmount);
            emit RefundClaimed(msg.sender, refundAmount);
            return;
        }
        
        // Normal case: only losers get refund
        require(msg.sender != winner, "Winner cannot claim refund");
        
        refundClaimed[msg.sender] = true;
        payable(msg.sender).transfer(refundAmount);
        
        emit RefundClaimed(msg.sender, refundAmount);
    }
    
    /**
     * @notice Winner claims their prize (NFT or marks as claimed)
     * @dev Can only be called by winner after auction ends
     */
    function claimPrize() external {
        require(winnerRevealed, "Winner not revealed");
        require(msg.sender == winner, "Not the winner");
        require(!nftClaimed, "Prize already claimed");
        
        // Check if reserve price was met (if set)
        if (hasReservePrice) {
            require(reserveMet, "Reserve price not met - no sale occurred");
        }
        
        nftClaimed = true;
        
        // Transfer NFT if this is an NFT auction
        if (hasNFT) {
            IERC721(nftContract).transferFrom(address(this), winner, nftTokenId);
            emit PrizeClaimed(winner, nftContract, nftTokenId);
        } else {
            emit PrizeClaimed(winner, address(0), 0);
        }
    }
    
    /**
     * @notice Seller claims payment from winning bid
     * @dev Can only be called by seller after winner is revealed
     */
    function claimPayment() external {
        require(winnerRevealed, "Winner not revealed");
        require(msg.sender == seller, "Not the seller");
        require(!sellerClaimed, "Payment already claimed");
        
        // Check if reserve price was met (if set)
        if (hasReservePrice) {
            require(reserveMet, "Reserve price not met - no payment available");
        }
        
        sellerClaimed = true;
        uint256 payment = revealedWinningBid;
        
        payable(seller).transfer(payment);
        
        emit PaymentClaimed(seller, payment);
    }
    
    /**
     * @notice Seller reclaims NFT if reserve price was not met
     * @dev Can only be called if reserve was set and not met
     */
    function reclaimNFT() external {
        require(winnerRevealed, "Winner not revealed");
        require(msg.sender == seller, "Not the seller");
        require(hasReservePrice, "No reserve price was set");
        require(!reserveMet, "Reserve price was met - cannot reclaim");
        require(hasNFT, "Not an NFT auction");
        require(!nftClaimed, "NFT already claimed");
        
        nftClaimed = true;
        
        IERC721(nftContract).transferFrom(address(this), seller, nftTokenId);
        
        emit NFTReclaimed(seller, nftContract, nftTokenId);
    }
    
    // ========================================
    // View Functions - Claim Status
    // ========================================
    
    /**
     * @notice Check if user can claim refund
     */
    function canClaimRefund(address user) external view returns (bool) {
        if (!winnerRevealed) return false;
        if (!bids[user].exists) return false;
        if (refundClaimed[user]) return false;
        
        // If reserve not met, everyone can claim
        if (hasReservePrice && !reserveMet) return true;
        
        // Normal case: only losers can claim
        return user != winner;
    }
    
    /**
     * @notice Check if user can claim prize
     */
    function canClaimPrize(address user) external view returns (bool) {
        if (!winnerRevealed) return false;
        if (user != winner) return false;
        if (nftClaimed) return false;
        if (hasReservePrice && !reserveMet) return false;
        
        return true;
    }
    
    /**
     * @notice Check if seller can claim payment
     */
    function canClaimPayment() external view returns (bool) {
        if (!winnerRevealed) return false;
        if (sellerClaimed) return false;
        if (hasReservePrice && !reserveMet) return false;
        
        return true;
    }
    
    /**
     * @notice Check if seller can reclaim NFT
     */
    function canReclaimNFT() external view returns (bool) {
        if (!winnerRevealed) return false;
        if (!hasReservePrice) return false;
        if (reserveMet) return false;
        if (!hasNFT) return false;
        if (nftClaimed) return false;
        
        return true;
    }
    
    // ========================================
    // Abstract Functions (Implemented by children)
    // ========================================
    
    /**
     * @notice Place a bid - implementation varies by auction type
     */
    function placeBid(
        externalEuint32 encryptedBid,
        bytes calldata inputProof
    ) external payable virtual;
    
    /**
     * @notice End the auction and determine winner
     */
    function endAuction() external virtual;
    
    /**
     * @notice Reveal the winner with decryption proof (v0.9 self-relaying)
     * @param decryptedIndex Clear winner index
     * @param decryptedBid Clear winning bid
     * @param abiEncodedClearValues ABI-encoded clear values for verification
     * @param decryptionProof KMS signature proof
     */
    function revealWinner(
        uint256 decryptedIndex,
        uint256 decryptedBid,
        bytes calldata abiEncodedClearValues,
        bytes calldata decryptionProof
    ) external virtual;
}
