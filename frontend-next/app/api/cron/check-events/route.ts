import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getEmailPreference, getEmailPreferencesForWallets } from '@/lib/supabase';
import { FACTORY_ADDRESS, AUCTION_ABI } from '@/lib/contracts/auctionUtils';
import { FACTORY_ABI } from '@/lib/contracts/factoryUtils';

// Store last checked block in memory (in production, use a database)
let lastCheckedBlock: number | null = null;

export async function GET(request: NextRequest) {
    // Support both Vercel automatic cron and manual triggers
    const authHeader = request.headers.get('authorization');
    const vercelCron = request.headers.get('x-vercel-cron');

    // Allow if either:
    // 1. Vercel's automatic cron (x-vercel-cron header present)
    // 2. Manual trigger with correct secret
    const isAuthorized =
        vercelCron === '1' || // Vercel automatic cron
        authHeader === `Bearer ${process.env.CRON_SECRET}`; // Manual trigger

    if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('[Cron] Starting auction event check...');
        console.log(`[Cron] Using Factory Address: ${FACTORY_ADDRESS}`);

        // Connect to blockchain
        const provider = new ethers.JsonRpcProvider(
            process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY'
        );

        const currentBlock = await provider.getBlockNumber();
        const fromBlock = lastCheckedBlock || currentBlock - 10; // Check last 10 blocks (Alchemy free tier limit)

        console.log(`[Cron] Checking blocks ${fromBlock} to ${currentBlock}`);

        // Get factory contract with proper ABI
        const factoryContract = new ethers.Contract(
            FACTORY_ADDRESS,
            FACTORY_ABI,
            provider
        );

        // Get all deployed auctions
        const deployedAuctions = await factoryContract.getDeployedAuctions();
        console.log(`[Cron] Found ${deployedAuctions.length} total auctions`);

        let emailsSent = 0;
        const processedAuctions: string[] = [];

        // Check each auction for AuctionEnded events
        for (const auctionAddress of deployedAuctions) {
            try {
                const auctionContract = new ethers.Contract(auctionAddress, AUCTION_ABI, provider);

                // Check for AuctionEnded events (limit to 10 blocks for Alchemy free tier)
                // fromBlock + 9 = 10 blocks inclusive (e.g., block 100 to 109 = 10 blocks)
                const queryToBlock = Math.min(fromBlock + 9, currentBlock);
                const endedEvents = await auctionContract.queryFilter(
                    auctionContract.filters.AuctionEnded(),
                    fromBlock,
                    queryToBlock
                );

                if (endedEvents.length > 0) {
                    console.log(`[Cron] Auction ${auctionAddress} ended, processing notifications...`);
                    processedAuctions.push(auctionAddress);

                    // Get auction details
                    const metadata = await auctionContract.getAuctionMetadata();
                    const state = await auctionContract.getAuctionState();
                    const seller = await auctionContract.seller();

                    // Get all bidders (limit to same block range)
                    const bidEvents = await auctionContract.queryFilter(
                        auctionContract.filters.BidPlaced(),
                        fromBlock,
                        queryToBlock
                    );
                    const bidders = [...new Set(bidEvents.map((e: any) => e.args.bidder))];

                    // Get winner (if revealed)
                    let winner = null;
                    let winningBid = null;
                    try {
                        const winnerInfo = await auctionContract.getWinnerInfo();
                        if (winnerInfo.isRevealed) {
                            winner = winnerInfo.winnerAddress;
                            winningBid = ethers.formatEther(winnerInfo.winningBidAmount);
                        }
                    } catch (e) {
                        // Winner not revealed yet
                    }

                    const auctionData = {
                        auctionTitle: metadata.title,
                        auctionAddress,
                        auctionType: 'First-Price',
                        bidCount: bidders.length,
                    };

                    console.log(`[Cron] Auction data:`, auctionData);
                    console.log(`[Cron] Seller address: ${seller}`);
                    console.log(`[Cron] Bidders:`, bidders);
                    console.log(`[Cron] Winner:`, winner);

                    // Notify seller
                    console.log(`[Cron] Attempting to notify seller: ${seller}`);
                    const sent1 = await notifyUser(seller, 'auction_ended_seller', auctionData);
                    console.log(`[Cron] Seller notification result: ${sent1}`);
                    if (sent1) emailsSent++;

                    // Notify winner
                    if (winner) {
                        const sent2 = await notifyUser(winner, 'winner_announced', {
                            ...auctionData,
                            winningBid: `${winningBid} ETH`,
                        });
                        if (sent2) emailsSent++;
                    }

                    // Notify all bidders
                    for (const bidder of bidders) {
                        if (bidder.toLowerCase() !== winner?.toLowerCase()) {
                            const sent3 = await notifyUser(bidder, 'auction_ended_bidder', auctionData);
                            if (sent3) emailsSent++;
                        }
                    }
                }
            } catch (error) {
                console.error(`[Cron] Error processing auction ${auctionAddress}:`, error);
            }
        }

        // Update last checked block
        lastCheckedBlock = currentBlock;

        console.log(`[Cron] Completed. Processed ${processedAuctions.length} auctions, sent ${emailsSent} emails`);

        return NextResponse.json({
            success: true,
            processed: processedAuctions.length,
            emailsSent,
            checkedBlocks: { from: fromBlock, to: currentBlock },
        });
    } catch (error: any) {
        console.error('[Cron] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to check events' },
            { status: 500 }
        );
    }
}

async function notifyUser(walletAddress: string, type: string, data: any): Promise<boolean> {
    try {
        // Get user's email preference
        const pref = await getEmailPreference(walletAddress);

        // Skip if no email
        if (!pref || !pref.email) {
            console.log(`[Notify] User ${walletAddress} has no email - skipping`);
            return false;
        }

        // Check if user wants this notification type
        if (type === 'auction_ended_seller' && !pref.notify_auction_ended) {
            console.log(`[Notify] User disabled auction_ended notifications - skipping`);
            return false;
        }
        if (type === 'winner_announced' && !pref.notify_winner_announced) {
            console.log(`[Notify] User disabled winner notifications - skipping`);
            return false;
        }

        // Send email - construct absolute URL
        // Priority: NEXT_PUBLIC_APP_URL > VERCEL_URL > hardcoded production URL
        let appUrl;
        if (process.env.NEXT_PUBLIC_APP_URL) {
            appUrl = process.env.NEXT_PUBLIC_APP_URL;
        } else if (process.env.VERCEL_URL) {
            appUrl = `https://${process.env.VERCEL_URL}`;
        } else {
            appUrl = 'https://fhe-auction-frontend.vercel.app';
        }

        console.log(`[Notify] Sending request to: ${appUrl}/api/send-notification`);

        const response = await fetch(`${appUrl}/api/send-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: pref.email, type, data }),
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error(`[Notify] Failed to send email to ${pref.email}`);
            console.error(`[Notify] Response status: ${response.status}`);
            console.error(`[Notify] Response body:`, JSON.stringify(responseData, null, 2));
            return false;
        }

        console.log(`[Notify] ✅ Sent ${type} email to ${pref.email}`);
        return true;
    } catch (error) {
        console.error(`[Notify] Error notifying ${walletAddress}:`, error);
        return false;
    }
}
