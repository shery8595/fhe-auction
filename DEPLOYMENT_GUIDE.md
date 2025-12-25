# 🚀 Deployment Walkthrough Guide

Complete step-by-step guide to deploy the FHE Auction Platform to Sepolia testnet and Vercel.

---

## 📋 Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Setup](#2-environment-setup)
3. [Contract Deployment](#3-contract-deployment)
4. [Contract Verification](#4-contract-verification)
5. [Frontend Deployment](#5-frontend-deployment)
6. [Testing the Deployment](#6-testing-the-deployment)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Prerequisites

### Required Software

| Software | Version | Installation |
|----------|---------|--------------|
| Node.js | ≥ 20.0.0 | [Download](https://nodejs.org/) |
| npm | ≥ 7.0.0 | Comes with Node.js |
| Git | Latest | [Download](https://git-scm.com/) |
| MetaMask | Latest | [Browser Extension](https://metamask.io/) |

### Required Accounts & Keys

1. **MetaMask Wallet** with seed phrase (mnemonic)
2. **Infura Account** for RPC access: [infura.io](https://infura.io/)
3. **Etherscan API Key** for verification: [etherscan.io/apis](https://etherscan.io/apis)
4. **Vercel Account** (optional, for frontend): [vercel.com](https://vercel.com/)

### Required Funds

- **Sepolia ETH**: ~0.1 ETH for contract deployment
  - Faucet: [sepoliafaucet.com](https://sepoliafaucet.com/)
  - Alchemy Faucet: [sepoliafaucet.com](https://www.alchemy.com/faucets/ethereum-sepolia)

---

## 2. Environment Setup

### Step 2.1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd fhevm-template

# Install dependencies
npm install
```

### Step 2.2: Configure Hardhat Variables

Hardhat uses encrypted variable storage for sensitive data:

```bash
# Set your wallet mnemonic (12-word seed phrase)
npx hardhat vars set MNEMONIC
# Prompt: Enter your 12-word mnemonic phrase

# Set Infura API key
npx hardhat vars set INFURA_API_KEY
# Prompt: Enter your Infura project ID

# Set Etherscan API key (for verification)
npx hardhat vars set ETHERSCAN_API_KEY
# Prompt: Enter your Etherscan API key
```

> ⚠️ **Security Warning**: Never share your mnemonic! It controls your wallet funds.

### Step 2.3: Verify Configuration

```bash
# List configured variables
npx hardhat vars list

# Should show:
# MNEMONIC ✓
# INFURA_API_KEY ✓
# ETHERSCAN_API_KEY ✓
```

### Step 2.4: Check Wallet Balance

```bash
# Run accounts task to see your addresses
npx hardhat accounts --network sepolia
```

Ensure the first address (deployer) has at least 0.1 Sepolia ETH.

---

## 3. Contract Deployment

### Step 3.1: Compile Contracts

```bash
npm run compile
```

Expected output:
```
Compiled 5 Solidity files successfully
✅ AuctionFactory
✅ BaseAuction
✅ FirstPriceAuction
✅ VickreyAuction
✅ DutchAuction
```

### Step 3.2: Deploy AuctionFactory to Sepolia

```bash
npx hardhat run scripts/deploy-factory.ts --network sepolia
```

**Expected output:**
```
==================================================
🏭 AuctionFactory Deployment
==================================================
Network: sepolia (Chain ID: 11155111)
Deployer: 0xYourDeployerAddress
Balance: 0.1234 ETH

Deploying AuctionFactory...
Waiting for confirmation...

✅ AuctionFactory deployed to: 0xFactoryAddress

📁 Updated FACTORY_ADDRESS in: frontend/src/config.js

==================================================
🎉 FACTORY DEPLOYMENT COMPLETE!
==================================================

Factory Address: 0xFactoryAddress
Network: sepolia (11155111)
```

### Step 3.3: Save the Factory Address

Copy the factory address and save it. You'll need it for:
- Frontend configuration
- Contract verification
- Creating auctions

**Update `frontend/src/config.js`** (if not auto-updated):
```javascript
export const FACTORY_ADDRESS = "0xYourFactoryAddress";
export const NETWORK_ID = 11155111;
```

---

## 4. Contract Verification

Verify your contract on Etherscan for transparency and trust.

### Step 4.1: Verify AuctionFactory

```bash
npx hardhat verify --network sepolia <FACTORY_ADDRESS>
```

**Example:**
```bash
npx hardhat verify --network sepolia 0x1234567890abcdef...
```

**Expected output:**
```
Successfully submitted source code for contract
contracts/AuctionFactory.sol:AuctionFactory at 0x...
https://sepolia.etherscan.io/address/0x...#code
```

### Step 4.2: Verify Individual Auctions (After Creation)

When auctions are created, verify them with constructor arguments:

```bash
# First-Price Auction
npx hardhat verify --network sepolia <AUCTION_ADDRESS> \
  "Auction Title" \
  "Description" \
  60 \
  100 \
  "0xSellerAddress" \
  "0x0000000000000000000000000000000000000000" \
  0
```

---

## 5. Frontend Deployment

### Option A: Deploy to Vercel (Recommended)

#### Step 5.1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 5.2: Navigate to Frontend

```bash
cd frontend
```

#### Step 5.3: Deploy

```bash
vercel
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Link to existing project?** No (create new)
- **Project name:** fhe-auction-platform
- **Directory:** `./` (current)
- **Build command:** `npm run build`
- **Output directory:** `dist`

#### Step 5.4: Deploy to Production

```bash
vercel --prod
```

**Expected output:**
```
✅ Production: https://fhe-auction-platform.vercel.app
```

### Option B: Deploy to Netlify

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Drag and drop the `dist` folder to [app.netlify.com/drop](https://app.netlify.com/drop)

### Option C: Deploy to GitHub Pages

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Push `dist` to the `gh-pages` branch or configure GitHub Pages in repository settings.

---

## 6. Testing the Deployment

### Step 6.1: Connect Wallet

1. Open your deployed frontend URL
2. Click "Connect Wallet"
3. Ensure MetaMask is on **Sepolia** network
4. Approve the connection

### Step 6.2: Create a Test Auction

1. Navigate to "Create Auction"
2. Fill in details:
   - **Title:** "Test Auction"
   - **Type:** First-Price Sealed Bid
   - **Duration:** 10 minutes
   - **Minimum Bid:** 0.001 ETH
3. Click "Submit Request"
4. Approve the transaction in MetaMask

### Step 6.3: Admin Approval

1. Go to "Admin Panel"
2. Find your pending request
3. Click "Approve"
4. Deploy the auction contract through the browser

### Step 6.4: Place a Test Bid

1. Navigate to your auction
2. Enter a bid amount
3. The frontend will:
   - Encrypt your bid using the FHE SDK
   - Submit the encrypted bid to the blockchain
4. Approve the transaction

### Step 6.5: Complete the Auction

1. Wait for the auction to end (or use time manipulation in testing)
2. Click "End Auction" to finalize
3. Click "Reveal Winner" to decrypt results
4. Winner can claim the item, losers claim refunds

---

## 7. Troubleshooting

### Common Issues

#### ❌ "Insufficient funds for gas"
**Solution:** Get more Sepolia ETH from a faucet.

#### ❌ "Network mismatch"
**Solution:** Switch MetaMask to Sepolia network (Chain ID: 11155111).

#### ❌ "MNEMONIC not set"
**Solution:** Run `npx hardhat vars set MNEMONIC` and enter your seed phrase.

#### ❌ "Contract verification failed"
**Solutions:**
- Wait 30-60 seconds after deployment before verifying
- Ensure ETHERSCAN_API_KEY is set correctly
- Check that constructor arguments match exactly

#### ❌ "FHE initialization failed"
**Solutions:**
- Ensure you're on Sepolia testnet (not mainnet or other testnets)
- Check browser console for detailed error
- Refresh the page and try again

#### ❌ "Transaction reverted"
**Solutions:**
- Check auction is still active (not ended)
- Ensure bid meets minimum requirements
- Verify sufficient ETH for bid + gas

### Debug Commands

```bash
# Check wallet balance
npx hardhat balance --account 0 --network sepolia

# View deployed contracts
npx hardhat console --network sepolia
> const Factory = await ethers.getContractFactory("AuctionFactory")
> const factory = await Factory.attach("0xFactoryAddress")
> await factory.getDeployedAuctions()

# Check network connection
npx hardhat test --network sepolia
```

### Getting Help

- **Zama Discord**: [discord.gg/zama](https://discord.gg/zama)
- **GitHub Issues**: Report bugs in the repository
- **FHEVM Docs**: [docs.zama.ai/fhevm](https://docs.zama.ai/fhevm)

---

## 📊 Deployment Checklist

| Step | Status |
|------|--------|
| Node.js 20+ installed | ☐ |
| npm dependencies installed | ☐ |
| MNEMONIC configured | ☐ |
| INFURA_API_KEY configured | ☐ |
| ETHERSCAN_API_KEY configured | ☐ |
| Sepolia ETH in wallet | ☐ |
| Contracts compiled | ☐ |
| AuctionFactory deployed | ☐ |
| Contract verified on Etherscan | ☐ |
| Frontend config updated | ☐ |
| Frontend deployed | ☐ |
| Test auction created | ☐ |
| Test bid placed | ☐ |

---

## 🎉 Congratulations!

Your FHE Auction Platform is now live! 

**Next Steps:**
1. Share your deployment URL
2. Record a demo video for your submission
3. Submit to the Zama Developer Program

---

**Built with ❤️ for the Zama Developer Program**
