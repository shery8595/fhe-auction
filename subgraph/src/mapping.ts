import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts"
import {
    AuctionApproved as AuctionApprovedEvent
} from "../generated/AuctionFactory/AuctionFactory"
import {
    BidPlaced as BidPlacedEvent,
    AuctionEnded as AuctionEndedEvent,
    WinnerRevealed as WinnerRevealedEvent,
    BaseAuction as BaseAuctionContract
} from "../generated/templates/BaseAuction/BaseAuction"
import { BaseAuction as BaseAuctionTemplate } from "../generated/templates"
import { Auction, Bid, User, Winner, GlobalStats } from "../generated/schema"

// Helper function to get or create GlobalStats
function getOrCreateGlobalStats(): GlobalStats {
    let stats = GlobalStats.load("global")
    if (stats == null) {
        stats = new GlobalStats("global")
        stats.totalAuctions = 0
        stats.activeAuctions = 0
        stats.endedAuctions = 0
        stats.totalBids = 0
        stats.totalUsers = 0
        stats.lastUpdated = BigInt.fromI32(0)
    }
    return stats
}

// Helper function to get or create User
function getOrCreateUser(address: Address, timestamp: BigInt): User {
    let user = User.load(address.toHex())
    if (user == null) {
        user = new User(address.toHex())
        user.totalAuctionsCreated = 0
        user.totalBids = 0
        user.firstSeenAt = timestamp
        user.lastSeenAt = timestamp

        // Update global stats
        let stats = getOrCreateGlobalStats()
        stats.totalUsers = stats.totalUsers + 1
        stats.lastUpdated = timestamp
        stats.save()
    } else {
        user.lastSeenAt = timestamp
    }
    return user
}

// Helper function to map auction type enum
function getAuctionType(auctionType: i32): string {
    if (auctionType == 0) return "FIRST_PRICE"
    if (auctionType == 1) return "VICKREY"
    if (auctionType == 2) return "DUTCH"
    return "FIRST_PRICE"
}

export function handleAuctionApproved(event: AuctionApprovedEvent): void {
    let auctionAddress = event.params.auction
    let auction = new Auction(auctionAddress.toHex())

    // Create data source for this auction contract
    BaseAuctionTemplate.create(auctionAddress)

    // Fetch metadata from contract
    let contract = BaseAuctionContract.bind(auctionAddress)
    let metadataResult = contract.try_getAuctionMetadata()

    let sellerAddress: Address
    if (!metadataResult.reverted) {
        let metadata = metadataResult.value
        auction.title = metadata.getTitle()
        auction.description = metadata.getDescription()
        sellerAddress = metadata.getAuctionSeller()
        // v0.9 only supports First-Price auctions
        auction.auctionType = "FIRST_PRICE"
        auction.minimumBid = metadata.getMinBid()
    } else {
        // Fallback values if contract call fails
        auction.title = "Unknown"
        auction.description = ""

        // Try to get seller from contract
        let sellerResult = contract.try_seller()
        sellerAddress = !sellerResult.reverted ? sellerResult.value : Address.zero()

        // Since we only support First-Price auctions in v0.9, always set to FIRST_PRICE
        auction.auctionType = "FIRST_PRICE"

        // Try to get minimum bid from contract
        let minBidResult = contract.try_minimumBid()
        auction.minimumBid = !minBidResult.reverted ? minBidResult.value : BigInt.fromI32(0)
    }

    // Set seller and sellerAddress
    auction.seller = sellerAddress.toHex()
    auction.sellerAddress = sellerAddress

    // Fetch state
    let stateResult = contract.try_getAuctionState()
    if (!stateResult.reverted) {
        let state = stateResult.value
        auction.startTime = state.getStartTime()
        auction.endTime = state.getEndTime()
        auction.ended = state.getEnded()
    } else {
        auction.startTime = event.block.timestamp
        auction.endTime = event.block.timestamp.plus(BigInt.fromI32(86400)) // 1 day default
        auction.ended = false
    }

    // NFT info
    let hasNFTResult = contract.try_hasNFT()
    auction.hasNFT = !hasNFTResult.reverted && hasNFTResult.value

    if (auction.hasNFT) {
        let nftInfoResult = contract.try_getNFTInfo()
        if (!nftInfoResult.reverted) {
            let nftInfo = nftInfoResult.value
            auction.nftContract = nftInfo.getNftContractAddress()
            auction.nftTokenId = nftInfo.getTokenId()
            auction.nftClaimed = nftInfo.getClaimed()
        }
    }

    // Privacy features - just flags
    let privacyResult = contract.try_getPrivacyInfo()
    if (!privacyResult.reverted) {
        auction.hasReservePrice = privacyResult.value.getHasReserve()
    } else {
        auction.hasReservePrice = false
    }

    // Statistics
    auction.bidCount = 0
    auction.bidderCount = 0

    // Metadata
    auction.createdAt = event.block.timestamp
    auction.createdTxHash = event.transaction.hash
    auction.createdBlock = event.block.number

    auction.save()

    // Update user
    let user = getOrCreateUser(sellerAddress, event.block.timestamp)
    user.totalAuctionsCreated = user.totalAuctionsCreated + 1
    user.save()

    // Update global stats
    let stats = getOrCreateGlobalStats()
    stats.totalAuctions = stats.totalAuctions + 1
    stats.activeAuctions = stats.activeAuctions + 1
    stats.lastUpdated = event.block.timestamp
    stats.save()
}

export function handleBidPlaced(event: BidPlacedEvent): void {
    let bidId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
    let bid = new Bid(bidId)

    bid.auction = event.address.toHex()
    bid.bidder = event.params.bidder.toHex()
    bid.bidderAddress = event.params.bidder
    bid.escrowAmount = event.params.escrowAmount
    bid.timestamp = event.block.timestamp
    bid.txHash = event.transaction.hash
    bid.blockNumber = event.block.number

    bid.save()

    // Update auction
    let auction = Auction.load(event.address.toHex())
    if (auction != null) {
        auction.bidCount = auction.bidCount + 1

        // Check if this is the first bid from this bidder
        // We check by loading previous bids with a constructed ID pattern
        let existingBids = auction.bids
        let isNewBidder = true

        // Simple approach: iterate through bidder's bids (derived field won't work here)
        // Instead, we'll check if any bid from this auction has this bidder
        // For efficiency, we'll just track if we've seen this bidder on this auction
        // Note: This is a simplified approach - for production you might want a better solution

        // For now, we'll just increment bidder count on each unique bidder
        // A more accurate approach would require maintaining a separate tracking entity
        let bidderId = event.address.toHex() + "-" + event.params.bidder.toHex()
        let bidderCheck = Bid.load(bidderId)

        // Since we can't easily check historical bids, we'll use contract state if available
        let contract = BaseAuctionContract.bind(event.address)
        let stateResult = contract.try_getAuctionState()
        if (!stateResult.reverted) {
            auction.bidderCount = stateResult.value.getBidderCount().toI32()
        }

        auction.save()
    }

    // Update user
    let user = getOrCreateUser(event.params.bidder, event.block.timestamp)
    user.totalBids = user.totalBids + 1
    user.save()

    // Update global stats
    let stats = getOrCreateGlobalStats()
    stats.totalBids = stats.totalBids + 1
    stats.lastUpdated = event.block.timestamp
    stats.save()
}

export function handleAuctionEnded(event: AuctionEndedEvent): void {
    let auction = Auction.load(event.address.toHex())
    if (auction != null) {
        auction.ended = true
        auction.endedAt = event.block.timestamp
        auction.endedTxHash = event.transaction.hash
        auction.endedBlock = event.block.number

        auction.save()

        // Update global stats
        let stats = getOrCreateGlobalStats()
        stats.activeAuctions = stats.activeAuctions - 1
        stats.endedAuctions = stats.endedAuctions + 1
        stats.lastUpdated = event.block.timestamp
        stats.save()
    }
}

export function handleWinnerRevealed(event: WinnerRevealedEvent): void {
    let winner = new Winner(event.address.toHex())

    winner.auction = event.address.toHex()
    winner.winner = event.params.winner
    winner.winningBid = event.params.winningBid
    winner.revealedAt = event.block.timestamp
    winner.revealTxHash = event.transaction.hash
    winner.revealBlock = event.block.number

    winner.save()
}