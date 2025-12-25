# FHE Auction Subgraph

Subgraph for indexing FHE Auction Platform events on Sepolia testnet.

## Features

- ✅ Indexes all auction events (deployed, bids, ended, winner revealed)
- ✅ Tracks user statistics (auctions created, bids placed)
- ✅ Provides global platform statistics
- ✅ Respects FHE privacy (only indexes public data)
- ✅ Fast queries with pagination and filtering

## Setup

### 1. Install Dependencies

```bash
cd subgraph
npm install
```

### 2. Authenticate with The Graph Studio

```bash
npx graph auth --studio YOUR_DEPLOY_KEY
```

Get your deploy key from: https://thegraph.com/studio/

### 3. Generate Code

```bash
npm run codegen
```

This generates TypeScript types from your schema and ABIs.

### 4. Build

```bash
npm run build
```

### 5. Deploy

```bash
npm run deploy
```

## Development

### Update Schema

1. Edit `schema.graphql`
2. Run `npm run codegen`
3. Update `src/mapping.ts` if needed
4. Run `npm run build`
5. Run `npm run deploy`

### Update Event Handlers

1. Edit `src/mapping.ts`
2. Run `npm run build`
3. Run `npm run deploy`

### Update Contract Address or Start Block

1. Edit `subgraph.yaml`
2. Run `npm run codegen`
3. Run `npm run build`
4. Run `npm run deploy`

## Queries

### Get Active Auctions

```graphql
{
  auctions(where: { ended: false }, first: 10, orderBy: endTime, orderDirection: asc) {
    id
    title
    seller
    auctionType
    minimumBid
    endTime
    bidCount
  }
}
```

### Get User Dashboard

```graphql
{
  user(id: "0x...") {
    totalAuctionsCreated
    totalBids
    auctionsCreated(first: 10) {
      id
      title
      ended
      bidCount
    }
    bids(first: 10) {
      auction {
        title
      }
      timestamp
    }
  }
}
```

### Get Statistics

```graphql
{
  globalStats(id: "global") {
    totalAuctions
    activeAuctions
    endedAuctions
    totalBids
    totalUsers
  }
}
```

## Privacy Compliance

This subgraph respects FHE privacy:

- ✅ Only indexes **public** auction metadata
- ❌ Does NOT index encrypted bid amounts
- ❌ Does NOT index bidder identities before reveal
- ✅ Winner info only indexed after reveal event

## Entities

- **Auction**: Auction metadata and state
- **Bid**: Bid events (escrow amounts, not actual bids)
- **User**: User statistics
- **Winner**: Revealed winner information
- **GlobalStats**: Platform-wide statistics

## Network

- **Network**: Sepolia
- **Factory Address**: `0x843D293BB45dF038C0Cb712156D72085C422F42e`
- **Start Block**: 7000000

## Links

- **Studio**: https://thegraph.com/studio/
- **Playground**: https://api.studio.thegraph.com/query/YOUR_ID/fhe-auction/version/latest
