# FHE Auction Platform - Frontend

A privacy-preserving auction platform built with Next.js, featuring Fully Homomorphic Encryption (FHE) for confidential bidding.

## Features

- 🔒 **Private Bidding** - Bids are encrypted using FHE technology
- 🎨 **NFT Auctions** - Support for ERC-721 NFT auctions with automatic metadata fetching
- 📊 **Real-time Updates** - Live auction data via The Graph subgraph
- 🌐 **Wallet Integration** - RainbowKit for seamless wallet connection
- 📈 **Statistics Dashboard** - Comprehensive auction analytics
- 👨‍💼 **Admin Panel** - Auction approval and management system

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Blockchain**: Ethereum (Sepolia Testnet)
- **Encryption**: Zama FHE SDK
- **Wallet**: RainbowKit + Wagmi
- **Data**: The Graph (Subgraph)
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+ and npm
- MetaMask or compatible Web3 wallet
- Sepolia testnet ETH (for testing)

## Local Development

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd frontend-next
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the root directory:

```env
# WalletConnect Project ID (get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Deployed Factory Contract Address
NEXT_PUBLIC_FACTORY_ADDRESS=0xYourFactoryAddress

# The Graph Subgraph URL
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/your-subgraph-id/your-subgraph-name/version/latest
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building for Production

```bash
npm run build
npm start
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed Vercel deployment instructions.

## Project Structure

```
frontend-next/
├── app/                    # Next.js app directory
│   ├── admin/             # Admin dashboard
│   ├── auction/           # Auction pages (create, detail)
│   ├── auctions/          # Browse auctions
│   ├── bids/              # User bids page
│   ├── dashboard/         # User dashboard
│   ├── docs/              # Documentation page
│   ├── settings/          # User settings
│   ├── statistics/        # Platform statistics
│   └── wallet/            # Wallet management
├── components/            # Reusable React components
│   └── ui/               # UI components (carousel, etc.)
├── lib/                   # Utility libraries
│   ├── contracts/        # Smart contract interactions
│   ├── fhevm.ts          # FHE SDK integration
│   ├── nftUtils.ts       # NFT metadata fetching
│   ├── subgraph.ts       # The Graph queries
│   └── wagmi.ts          # Wagmi configuration
├── public/                # Static assets
└── .env.local            # Environment variables (not committed)
```

## Key Features Explained

### FHE Encrypted Bidding

Bids are encrypted client-side using Zama's FHE SDK before being sent to the blockchain. This ensures:
- Bid amounts remain private until auction ends
- No one (including the auctioneer) can see bid values
- Fully verifiable on-chain

### NFT Metadata Fetching

The platform automatically fetches NFT metadata directly from the blockchain:
- Supports Base64-encoded metadata
- IPFS URI conversion
- Embedded SVG data
- Fallback to placeholder images

### The Graph Integration

Real-time auction data is indexed and queried via The Graph:
- Fast auction browsing
- Efficient filtering and sorting
- Historical data tracking

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project ID | Yes |
| `NEXT_PUBLIC_FACTORY_ADDRESS` | Deployed AuctionFactory contract address | Yes |
| `NEXT_PUBLIC_SUBGRAPH_URL` | The Graph subgraph endpoint URL | Yes |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is part of the FHE Auction Platform.

## Support

For issues and questions:
- Open an issue on GitHub
- Check the [documentation](./DEPLOYMENT.md)
