# Subgraph Deployment Guide

## Quick Start

### 1. Install Dependencies
```bash
cd subgraph
npm install
```

### 2. Get Your Deploy Key
1. Go to https://thegraph.com/studio/
2. Sign in with your wallet
3. Create a new subgraph called "fhe-auction"
4. Copy your deploy key

### 3. Authenticate
```bash
npx graph auth --studio YOUR_DEPLOY_KEY
```

### 4. Generate, Build, and Deploy
```bash
npm run codegen
npm run build
npm run deploy
```

## What Happens Next

1. **Indexing**: The Graph will start indexing your contracts from block 7000000
2. **Syncing**: Wait 5-15 minutes for initial sync
3. **Query**: Use the playground to test queries
4. **Integrate**: Update frontend to use the subgraph URL

## Deployment URL

After deployment, your subgraph will be available at:
```
https://api.studio.thegraph.com/query/YOUR_ID/fhe-auction/version/latest
```

Replace `YOUR_ID` with your actual user ID from The Graph Studio.

## Update Frontend

Once deployed, update `frontend-next/lib/subgraph.ts`:
```typescript
const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/YOUR_ID/fhe-auction/version/latest';
```

## Troubleshooting

### Build Errors
- Make sure ABIs are in `abis/` folder
- Run `npm run codegen` before `npm run build`

### Deployment Errors
- Check your deploy key is correct
- Make sure you're authenticated: `npx graph auth --studio YOUR_KEY`

### Syncing Issues
- Check the start block in `subgraph.yaml`
- Verify contract address is correct
- Wait 10-15 minutes for initial sync

## Next Steps

1. ✅ Deploy subgraph
2. ✅ Wait for sync
3. ✅ Test queries in playground
4. ✅ Update frontend to use subgraph
5. ✅ Remove RPC calls from dashboard
6. ✅ Add statistics page

Ready to deploy! 🚀
