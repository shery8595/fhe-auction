import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

// WalletConnect Project ID
// Get your project ID from https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '284f252b26122e2efbb74adec126058d';

export const config = getDefaultConfig({
    appName: 'FHE Auction Platform',
    projectId,
    chains: [sepolia],
    ssr: true,
});
