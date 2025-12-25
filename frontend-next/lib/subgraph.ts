// Subgraph client for FHE Auction Platform
const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/1721363/fhe-auction/version/latest';

export interface SubgraphAuction {
    id: string;
    title: string;
    description: string;
    seller: string;
    auctionType: string; // Changed from number to string (always "FIRST_PRICE" in v0.9)
    minimumBid: string;
    startTime: string;
    endTime: string;
    ended: boolean;
    bidCount: number;
    bidderCount?: number;
    createdAt: string;
    hasNFT?: boolean;
    nftContract?: string;
    nftTokenId?: string;
}

export interface SubgraphBid {
    id: string;
    bidder: string;
    escrowAmount: string;
    timestamp: string;
    auction: {
        id: string;
        title: string;
        auctionType: string; // Changed from number to string
        ended: boolean;
    };
}

export interface SubgraphUser {
    id: string;
    totalAuctionsCreated: number;
    totalBids: number;
    firstSeenAt: string;
}

export interface SubgraphStats {
    totalAuctions: number;
    activeAuctions: number;
    endedAuctions: number;
    totalBids: number;
    totalUsers?: number;
}

async function querySubgraph(query: string, variables?: any) {
    try {
        const response = await fetch(SUBGRAPH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                variables,
            }),
            next: { revalidate: 10 }, // Cache for 10 seconds
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.errors) {
            console.error('Subgraph query errors:', data.errors);
            throw new Error(data.errors[0]?.message || 'Subgraph query failed');
        }

        return data.data;
    } catch (error) {
        console.error('Subgraph query error:', error);
        throw error;
    }
}

// Get all auctions with pagination
export async function getAuctions(first = 20, skip = 0, orderBy = 'createdAt', orderDirection: 'asc' | 'desc' = 'desc') {
    const query = `
        query GetAuctions($first: Int!, $skip: Int!) {
            auctions(first: $first, skip: $skip, orderBy: ${orderBy}, orderDirection: ${orderDirection}) {
                id
                title
                description
                seller
                auctionType
                minimumBid
                startTime
                endTime
                ended
                bidCount
                createdAt
                hasNFT
                nftContract
                nftTokenId
            }
        }
    `;

    return querySubgraph(query, { first, skip });
}

// Get active auctions only
export async function getActiveAuctions(first = 20) {
    const query = `
        query GetActiveAuctions($first: Int!) {
            auctions(
                first: $first
                where: { ended: false }
                orderBy: endTime
                orderDirection: asc
            ) {
                id
                title
                description
                seller
                auctionType
                minimumBid
                startTime
                endTime
                ended
                bidCount
                createdAt
                hasNFT
                nftContract
                nftTokenId
            }
        }
    `;

    return querySubgraph(query, { first });
}

// Get auctions by seller
export async function getUserAuctions(seller: string, first = 50) {
    const query = `
        query GetUserAuctions($seller: String!, $first: Int!) {
            auctions(
                where: { seller: $seller }
                first: $first
                orderBy: createdAt
                orderDirection: desc
            ) {
                id
                title
                description
                auctionType
                minimumBid
                startTime
                endTime
                ended
                bidCount
                createdAt
            }
        }
    `;

    return querySubgraph(query, { seller: seller.toLowerCase(), first });
}

// Get bids by bidder
export async function getUserBids(bidder: string, first = 50) {
    const query = `
        query GetUserBids($bidder: String!, $first: Int!) {
            bids(
                where: { bidder: $bidder }
                first: $first
                orderBy: timestamp
                orderDirection: desc
            ) {
                id
                bidder
                escrowAmount
                timestamp
                auction {
                    id
                    title
                    auctionType
                    ended
                }
            }
        }
    `;

    return querySubgraph(query, { bidder: bidder.toLowerCase(), first });
}

// Get single auction by ID
export async function getAuctionById(id: string) {
    const query = `
        query GetAuction($id: ID!) {
            auction(id: $id) {
                id
                title
                description
                seller
                auctionType
                minimumBid
                startTime
                endTime
                ended
                bidCount
                createdAt
            }
        }
    `;

    return querySubgraph(query, { id: id.toLowerCase() });
}

// Get statistics
export async function getStatistics(): Promise<SubgraphStats> {
    const query = `
        query GetStatistics {
            auctions(first: 1000) {
                id
                ended
                bidCount
            }
        }
    `;

    try {
        const data = await querySubgraph(query);

        const totalAuctions = data.auctions.length;
        const activeAuctions = data.auctions.filter((a: any) => !a.ended).length;
        const totalBids = data.auctions.reduce((sum: number, a: any) => sum + parseInt(a.bidCount || '0'), 0);

        return {
            totalAuctions,
            activeAuctions,
            endedAuctions: totalAuctions - activeAuctions,
            totalBids,
        };
    } catch (error) {
        console.error('Failed to get statistics:', error);
        return {
            totalAuctions: 0,
            activeAuctions: 0,
            endedAuctions: 0,
            totalBids: 0,
        };
    }
}

// Get user profile
export async function getUser(address: string): Promise<SubgraphUser | null> {
    const query = `
        query GetUser($id: ID!) {
            user(id: $id) {
                id
                totalAuctionsCreated
                totalBids
                firstSeenAt
            }
        }
    `;

    try {
        const data = await querySubgraph(query, { id: address.toLowerCase() });
        return data.user;
    } catch (error) {
        console.error('Failed to get user:', error);
        return null;
    }
}

// Get recently ended auctions (for cron job)
export async function getRecentlyEndedAuctions(since: number, first = 100) {
    const query = `
        query GetRecentlyEndedAuctions($since: BigInt!, $first: Int!) {
            auctions(
                where: { ended: true, endedAt_gte: $since }
                first: $first
                orderBy: endedAt
                orderDirection: desc
            ) {
                id
                title
                seller
                auctionType
                bidCount
                endedAt
            }
        }
    `;

    return querySubgraph(query, { since: since.toString(), first });
}
