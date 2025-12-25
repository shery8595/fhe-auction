# Quick Git Commands for Deployment

## Initial Setup (if you haven't pushed to GitHub yet)

### 1. Create a new repository on GitHub
- Go to https://github.com/new
- Create a repository (e.g., "fhe-auction-frontend")
- **DO NOT** initialize with README (you already have one)

### 2. Link your local repo to GitHub

```bash
# If you haven't initialized git yet
git init

# Add your GitHub repository as remote (replace with your URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Verify remote was added
git remote -v
```

## Committing and Pushing to GitHub

### Check what will be committed

```bash
git status
```

### Add all files

```bash
git add .
```

### Commit with a message

```bash
git commit -m "Initial commit: FHE Auction Platform"
```

### Push to GitHub

```bash
# First time push (sets upstream)
git push -u origin master

# Or if your branch is called 'main'
git push -u origin main

# Subsequent pushes
git push
```

## After Making Changes

```bash
# Check what changed
git status

# Add all changes
git add .

# Commit
git commit -m "Description of your changes"

# Push to GitHub (triggers Vercel deployment)
git push
```

## Useful Commands

### View commit history
```bash
git log --oneline
```

### Undo last commit (keep changes)
```bash
git reset --soft HEAD~1
```

### Discard all local changes
```bash
git reset --hard HEAD
```

### Create a new branch
```bash
git checkout -b feature/new-feature
```

### Switch branches
```bash
git checkout master
```

## Files That Will Be Committed

Based on your `git status`, these files will be added:

**Modified files:**
- `app/globals.css`
- `app/layout.tsx`
- `app/page.tsx`
- `package-lock.json`
- `package.json`
- `tsconfig.json`

**New files/directories:**
- `EMAIL_SETUP.md`
- `README.md` (updated)
- `DEPLOYMENT.md` (new)
- `app/admin/`
- `app/api/`
- `app/auction/`
- `app/auctions/`
- `app/bids/`
- `app/dashboard/`
- `app/docs/`
- `app/providers.tsx`
- `app/settings/`
- `app/statistics/`
- `app/wallet/`
- `components/`
- `lib/`
- `next.config.js`
- `postcss.config.js`
- `public/kms_lib_bg.wasm`
- `public/tfhe_bg.wasm`
- `supabase-schema.sql`
- `tailwind.config.js`
- `vercel.json`

**Files that will NOT be committed (excluded by .gitignore):**
- `.env.local` ✅ (contains sensitive keys)
- `node_modules/` ✅ (dependencies)
- `.next/` ✅ (build output)

## Ready to Deploy?

Run these commands in order:

```bash
# 1. Check status
git status

# 2. Add all files
git add .

# 3. Commit
git commit -m "feat: Complete FHE Auction Platform with NFT support"

# 4. Push to GitHub
git push -u origin master

# 5. Go to vercel.com and import your GitHub repository
```

## Environment Variables to Set in Vercel

After pushing to GitHub and importing to Vercel, add these environment variables in Vercel dashboard:

1. `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - Your WalletConnect project ID
2. `NEXT_PUBLIC_FACTORY_ADDRESS` - Your deployed factory contract address  
3. `NEXT_PUBLIC_SUBGRAPH_URL` - Your Graph subgraph URL

Then click "Deploy"!

---

**Need help?** Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.
