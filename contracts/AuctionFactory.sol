// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "./BaseAuction.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/**
 * @title AuctionFactory
 * @notice Factory with integrated Chainlink Automation for all auctions
 * @dev Single upkeep monitors all deployed auctions - more efficient than per-auction upkeeps
 */
contract AuctionFactory is AutomationCompatibleInterface {
    // ========================================
    // Types
    // ========================================
    
    enum RequestStatus { PENDING, APPROVED, REJECTED }
    
    struct AuctionRequest {
        address seller;
        string title;
        string description;
        uint256 durationMinutes;
        uint256 minimumBid;
        // NFT support
        address nftContract;
        uint256 nftTokenId;
        // Status
        RequestStatus status;
        address deployedAuction;
        uint256 createdAt;
        uint256 processedAt;
    }
    
    // ========================================
    // State
    // ========================================
    
    AuctionRequest[] public requests;
    address[] public deployedAuctions;
    address[] public activeAuctions; // Auctions that need Chainlink monitoring
    mapping(address => address[]) public sellerAuctions;
    mapping(address => uint256[]) public sellerRequests;
    mapping(address => bool) public isActiveAuction; // Quick lookup for active auctions
    
    address public owner;
    
    // ========================================
    // Events
    // ========================================
    
    event AuctionRequested(
        uint256 indexed requestId,
        address indexed seller,
        string title
    );
    
    event AuctionApproved(
        uint256 indexed requestId,
        address indexed auction
    );
    
    event AuctionRejected(uint256 indexed requestId);
    event AuctionRegistered(address indexed auction);
    
    // ========================================
    // Constructor
    // ========================================
    
    constructor() {
        owner = msg.sender;
    }
    
    // ========================================
    // Admin Modifier
    // ========================================
    
    modifier onlyAdmin() {
        // Everyone is admin for demo purposes
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    // ========================================
    // Request Submission
    // ========================================
    
    function submitAuctionRequest(
        string calldata _title,
        string calldata _description,
        uint256 _durationMinutes,
        uint256 _minimumBid,
        address _nftContract,
        uint256 _nftTokenId
    ) external returns (uint256 requestId) {
        require(bytes(_title).length > 0, "Title required");
        require(_durationMinutes > 0, "Duration required");
        
        requestId = requests.length;
        
        requests.push(AuctionRequest({
            seller: msg.sender,
            title: _title,
            description: _description,
            durationMinutes: _durationMinutes,
            minimumBid: _minimumBid,
            nftContract: _nftContract,
            nftTokenId: _nftTokenId,
            status: RequestStatus.PENDING,
            deployedAuction: address(0),
            createdAt: block.timestamp,
            processedAt: 0
        }));
        
        sellerRequests[msg.sender].push(requestId);
        emit AuctionRequested(requestId, msg.sender, _title);
    }
    

    
    // ========================================
    // Admin: Register Externally Deployed Auction
    // ========================================
    
    /**
     * @notice Register an externally deployed auction for a pending request
     * @dev Use this instead of automatic deployment to avoid bytecode size limits
     */
    function registerAuction(uint256 requestId, address auctionAddress) external onlyAdmin {
        require(requestId < requests.length, "Invalid request ID");
        AuctionRequest storage req = requests[requestId];
        require(req.status == RequestStatus.PENDING, "Not pending");
        require(auctionAddress != address(0), "Invalid auction address");
        
        req.status = RequestStatus.APPROVED;
        req.deployedAuction = auctionAddress;
        req.processedAt = block.timestamp;
        
        deployedAuctions.push(auctionAddress);
        sellerAuctions[req.seller].push(auctionAddress);
        
        // Add to active auctions for Chainlink monitoring
        activeAuctions.push(auctionAddress);
        isActiveAuction[auctionAddress] = true;
        
        // Note: Browser-deployed auctions are already auto-approved in their constructor
        // so we don't need to call approve() here. The approve() function requires
        // msg.sender == factory (the deployer), which would fail since we're calling
        // from this factory contract, not the original deployer.
        
        emit AuctionApproved(requestId, auctionAddress);
    }
    
    /**
     * @notice Reject a pending request
     */
    function rejectRequest(uint256 requestId) external onlyAdmin {
        require(requestId < requests.length, "Invalid request ID");
        AuctionRequest storage req = requests[requestId];
        require(req.status == RequestStatus.PENDING, "Not pending");
        
        req.status = RequestStatus.REJECTED;
        req.processedAt = block.timestamp;
        
        emit AuctionRejected(requestId);
    }
    
    // ========================================
    // View Functions
    // ========================================
    
    function getRequestCount() external view returns (uint256) {
        return requests.length;
    }
    
    function getPendingRequests() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < requests.length; i++) {
            if (requests[i].status == RequestStatus.PENDING) count++;
        }
        
        uint256[] memory pending = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < requests.length; i++) {
            if (requests[i].status == RequestStatus.PENDING) {
                pending[idx++] = i;
            }
        }
        return pending;
    }
    
    function getDeployedAuctions() external view returns (address[] memory) {
        return deployedAuctions;
    }
    
    function getActiveAuctions() external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < deployedAuctions.length; i++) {
            if (BaseAuction(deployedAuctions[i]).isActive()) count++;
        }
        
        address[] memory active = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < deployedAuctions.length; i++) {
            if (BaseAuction(deployedAuctions[i]).isActive()) {
                active[idx++] = deployedAuctions[i];
            }
        }
        return active;
    }
    
    function getAuctionsBySeller(address seller) external view returns (address[] memory) {
        return sellerAuctions[seller];
    }
    
    function getRequestsBySeller(address seller) external view returns (uint256[] memory) {
        return sellerRequests[seller];
    }
    
    function getRequest(uint256 requestId) external view returns (
        address seller,
        string memory title,
        string memory description,
        uint256 durationMinutes,
        uint256 minimumBid,
        RequestStatus status,
        address deployedAuction,
        uint256 createdAt
    ) {
        require(requestId < requests.length, "Invalid request ID");
        AuctionRequest storage req = requests[requestId];
        return (
            req.seller,
            req.title,
            req.description,
            req.durationMinutes,
            req.minimumBid,
            req.status,
            req.deployedAuction,
            req.createdAt
        );
    }
    

    
    function getNFTRequestDetails(uint256 requestId) external view returns (
        address nftContract,
        uint256 nftTokenId
    ) {
        require(requestId < requests.length, "Invalid request ID");
        AuctionRequest storage req = requests[requestId];
        return (
            req.nftContract,
            req.nftTokenId
        );
    }
    
    // ========================================
    // Chainlink Automation
    // ========================================
    
    /**
     * @notice Check if any auction needs to be ended
     * @dev Called by Chainlink nodes off-chain
     */
    function checkUpkeep(bytes calldata /* checkData */)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        // Loop through active auctions to find one that needs ending
        for (uint256 i = 0; i < activeAuctions.length; i++) {
            address auctionAddr = activeAuctions[i];
            
            // Skip if already removed from active list
            if (!isActiveAuction[auctionAddr]) continue;
            
            try BaseAuction(auctionAddr).status() returns (BaseAuction.AuctionStatus auctionStatus) {
                // Check if auction needs ending
                if (auctionStatus == BaseAuction.AuctionStatus.APPROVED) {
                    try BaseAuction(auctionAddr).auctionEnded() returns (bool ended) {
                        if (!ended) {
                            try BaseAuction(auctionAddr).auctionEndTime() returns (uint256 endTime) {
                                if (block.timestamp >= endTime) {
                                    // Found an auction that needs ending!
                                    return (true, abi.encode(auctionAddr));
                                }
                            } catch {}
                        }
                    } catch {}
                }
            } catch {}
        }
        
        return (false, "");
    }
    
    /**
     * @notice End an auction that has expired
     * @dev Called by Chainlink nodes on-chain when checkUpkeep returns true
     *      CRITICAL: Must tolerate empty performData - Chainlink may send 0x
     *      CRITICAL: Must never revert - use defensive checks and try-catch
     */
    function performUpkeep(bytes calldata performData) external override {
        // 1️⃣ MUST tolerate empty performData (Chainlink may send 0x)
        if (performData.length == 0) {
            return; // Silent no-op, don't break automation
        }

        // 2️⃣ Safe decode (we know data is not empty)
        address auctionAddress = abi.decode(performData, (address));
        
        // 3️⃣ Defensive checks (no reverts - just return early)
        if (!isActiveAuction[auctionAddress]) return;
        
        BaseAuction auction = BaseAuction(auctionAddress);
        
        // Check conditions without reverting
        try auction.status() returns (BaseAuction.AuctionStatus auctionStatus) {
            if (auctionStatus != BaseAuction.AuctionStatus.APPROVED) return;
        } catch {
            return; // Auction contract has issues, skip it
        }
        
        try auction.auctionEnded() returns (bool ended) {
            if (ended) return; // Already ended, nothing to do
        } catch {
            return;
        }
        
        try auction.auctionEndTime() returns (uint256 endTime) {
            if (block.timestamp < endTime) return; // Not expired yet
        } catch {
            return;
        }
        
        // 4️⃣ Never let child revert break automation
        // Use try-catch to isolate auction-specific failures
        try auction.endAuction() {
            // Success - remove from active monitoring
            isActiveAuction[auctionAddress] = false;
        } catch {
            // Auction failed to end (e.g., no bids, custom logic failed)
            // Don't revert - just leave it in active list for retry
            // Optional: emit AuctionEndFailed(auctionAddress) for debugging
        }
    }
    
    /**
     * @notice Get count of active auctions being monitored
     */
    function getActiveAuctionCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < activeAuctions.length; i++) {
            if (isActiveAuction[activeAuctions[i]]) {
                count++;
            }
        }
        return count;
    }
}
