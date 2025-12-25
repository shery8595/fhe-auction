# Deployment Guide - FHE Auction Platform

This guide will walk you through deploying the FHE Auction Platform frontend to Vercel.

## Prerequisites

- GitHub account
- Vercel account (sign up at [vercel.com](https://vercel.com))
- Your environment variable values from `.env.local`

## Step 1: Prepare Your Repository

### 1.1 Verify .gitignore

Ensure your `.gitignore` file excludes sensitive files:

```bash
# Check that .env.local is NOT in git status
git status
```

The `.env.local` file should NOT appear in the output.

### 1.2 Commit Your Changes

```bash
# Add all files
git add .

# Commit with a descriptive message
git commit -m "Initial commit: FHE Auction Platform frontend"

# Push to GitHub (replace with your repo URL)
git push origin main
```

> **Note**: If you haven't set up a GitHub repository yet:
> 1. Go to [github.com](https://github.com) and create a new repository
> 2. Follow GitHub's instructions to push your local repository

## Step 2: Deploy to Vercel

### 2.1 Import Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your GitHub repository
5. Click **"Import"**

### 2.2 Configure Project

Vercel will auto-detect that this is a Next.js project. The default settings should work:

- **Framework Preset**: Next.js
- **Root Directory**: `./` (or leave blank)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 2.3 Add Environment Variables

**CRITICAL**: Before deploying, add your environment variables:

1. In the Vercel project settings, scroll to **"Environment Variables"**
2. Add each variable from your `.env.local` file:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Your WalletConnect Project ID | Production, Preview, Development |
| `NEXT_PUBLIC_FACTORY_ADDRESS` | Your deployed factory contract address | Production, Preview, Development |
| `NEXT_PUBLIC_SUBGRAPH_URL` | Your Graph subgraph URL | Production, Preview, Development |

> **Important**: Make sure to select all three environments (Production, Preview, Development) for each variable.

### 2.4 Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (usually 2-3 minutes)
3. Once deployed, Vercel will provide you with a URL (e.g., `your-project.vercel.app`)

## Step 3: Verify Deployment

### 3.1 Test the Deployment

1. Visit your Vercel URL
2. Connect your wallet (MetaMask)
3. Verify that:
   - Homepage loads correctly
   - Wallet connection works
   - Auctions are displayed
   - NFT images load properly

### 3.2 Check Environment Variables

If something doesn't work:

1. Go to your Vercel project dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Verify all variables are set correctly
4. If you made changes, click **"Redeploy"** in the **"Deployments"** tab

## Step 4: Custom Domain (Optional)

### 4.1 Add Custom Domain

1. In your Vercel project, go to **"Settings"** → **"Domains"**
2. Click **"Add"**
3. Enter your domain name
4. Follow Vercel's instructions to configure DNS

## Troubleshooting

### Build Fails

**Error**: `Module not found` or `Cannot find module`

**Solution**: 
```bash
# Locally, delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build

# If successful, commit and push
git add package-lock.json
git commit -m "Update dependencies"
git push
```

### Environment Variables Not Working

**Error**: Features that depend on environment variables don't work

**Solution**:
1. Check that variable names start with `NEXT_PUBLIC_` for client-side access
2. Verify variables are set in Vercel dashboard
3. Redeploy after adding/updating variables

### Wallet Connection Fails

**Error**: WalletConnect doesn't work

**Solution**:
1. Verify `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set correctly
2. Check that your WalletConnect project is active at [cloud.walletconnect.com](https://cloud.walletconnect.com)
3. Add your Vercel domain to allowed origins in WalletConnect dashboard

### NFT Images Don't Load

**Error**: NFT images show placeholders

**Solution**:
1. Check browser console for CORS errors
2. Verify NFT contracts are on Sepolia testnet
3. Test NFT metadata fetching locally first

### Subgraph Data Not Loading

**Error**: Auctions don't appear or stats show zero

**Solution**:
1. Verify `NEXT_PUBLIC_SUBGRAPH_URL` is correct
2. Check that your subgraph is deployed and synced
3. Test the subgraph URL in a GraphQL playground

## Continuous Deployment

Vercel automatically redeploys your app when you push to GitHub:

```bash
# Make changes locally
git add .
git commit -m "Update feature X"
git push origin main

# Vercel will automatically build and deploy
```

## Monitoring

### View Logs

1. Go to your Vercel project dashboard
2. Click **"Deployments"**
3. Click on a deployment
4. View **"Build Logs"** and **"Function Logs"**

### Analytics

Vercel provides built-in analytics:
- Go to **"Analytics"** tab in your project
- View page views, performance metrics, and more

## Production Checklist

Before going live, ensure:

- [ ] All environment variables are set correctly
- [ ] Smart contracts are deployed to mainnet (if applicable)
- [ ] Subgraph is deployed and synced
- [ ] Custom domain is configured (if using)
- [ ] Wallet connection works on production URL
- [ ] All features tested on production deployment
- [ ] Error tracking is set up (e.g., Sentry)
- [ ] Analytics are configured

## Support

If you encounter issues:

1. Check Vercel's [documentation](https://vercel.com/docs)
2. Review Next.js [deployment docs](https://nextjs.org/docs/deployment)
3. Open an issue on GitHub

## Next Steps

After successful deployment:

1. **Set up monitoring**: Consider adding error tracking (Sentry, LogRocket)
2. **Configure analytics**: Set up Google Analytics or Vercel Analytics
3. **Add CI/CD**: Set up automated testing before deployment
4. **Performance optimization**: Use Vercel's Speed Insights
5. **Security**: Enable Vercel's security features (DDoS protection, etc.)

---

**Congratulations!** 🎉 Your FHE Auction Platform is now live on Vercel!
