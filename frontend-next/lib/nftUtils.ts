/**
 * NFT Utility Functions - Alchemy API integration for fetching user NFTs
 * Supports Sepolia testnet
 */

// Alchemy API configuration
const ALCHEMY_API_KEY = 'PaLT2k9Z8eRg6JMlreGyk'; // Replace with your Alchemy API key
const ALCHEMY_BASE_URL = `https://eth-sepolia.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;

// ERC721 ABI for approval
export const ERC721_ABI = [
    "function approve(address to, uint256 tokenId) external",
    "function getApproved(uint256 tokenId) external view returns (address)",
    "function setApprovalForAll(address operator, bool approved) external",
    "function isApprovedForAll(address owner, address operator) external view returns (bool)",
    "function ownerOf(uint256 tokenId) external view returns (address)",
    "function tokenURI(uint256 tokenId) external view returns (string)",
    "function name() external view returns (string)",
    "function symbol() external view returns (string)"
];

export interface NFT {
    contractAddress: string;
    tokenId: string;
    name: string;
    description: string;
    image: string;
    collectionName: string;
    collectionSymbol: string;
    tokenType: string;
}

/**
 * Fetch all NFTs owned by user on Sepolia
 */
export async function fetchUserNFTs(ownerAddress: string): Promise<NFT[]> {
    try {
        const url = `${ALCHEMY_BASE_URL}/getNFTsForOwner?owner=${ownerAddress}&withMetadata=true&pageSize=50&refreshCache=true`;

        console.log('🔍 Fetching NFTs for address:', ownerAddress);
        console.log('📡 Alchemy API URL:', url);

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Alchemy API error:', response.status, response.statusText);
            console.error('❌ Error response:', errorText);
            throw new Error(`Alchemy API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 Alchemy API Response:', data);
        console.log('📊 Total NFTs found:', data.ownedNfts?.length || 0);

        // Transform Alchemy response to our format (matching old frontend)
        const nfts: NFT[] = data.ownedNfts.map((nft: any) => {
            const transformedNFT = {
                contractAddress: nft.contract.address,
                tokenId: nft.tokenId,
                name: nft.name || nft.raw?.metadata?.name || `Token #${nft.tokenId}`,
                description: nft.description || nft.raw?.metadata?.description || '',
                image: nft.image?.cachedUrl || nft.image?.originalUrl || nft.raw?.metadata?.image || getPlaceholderImage(nft.contract.address, nft.tokenId),
                collectionName: nft.contract.name || 'Unknown Collection',
                collectionSymbol: nft.contract.symbol || '',
                tokenType: nft.contract.tokenType || 'ERC721'
            };
            console.log('✨ Transformed NFT:', transformedNFT);
            return transformedNFT;
        });

        // Filter to only ERC721 tokens
        const erc721NFTs = nfts.filter(nft => nft.tokenType === 'ERC721');
        console.log('✅ ERC721 NFTs after filtering:', erc721NFTs.length);
        console.log('📋 Final NFT list:', erc721NFTs);

        return erc721NFTs;

    } catch (error) {
        console.error('❌ Error fetching NFTs:', error);
        return [];
    }
}

/**
 * Get placeholder image for NFT without image
 */
export function getPlaceholderImage(contractAddress: string, tokenId: string): string {
    // Generate a unique color based on address
    const hash = contractAddress.slice(2, 8);
    // Truncate token ID if too long
    const shortTokenId = tokenId.length > 8 ? tokenId.slice(0, 6) + '...' : tokenId;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="#${hash}"/>
        <text x="100" y="85" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">NFT</text>
        <text x="100" y="115" font-family="Arial, sans-serif" font-size="12" fill="rgba(255,255,255,0.8)" text-anchor="middle">#${shortTokenId}</text>
    </svg>`;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Safely encode string to base64, handling Unicode characters
 */
function unicodeSafeBase64(str: string): string {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt('0x' + p1));
    }));
}

/**
 * Get metadata for a specific NFT by fetching directly from blockchain
 * Follows the pattern from the Python Web3 implementation
 */
export async function getNFTMetadata(contractAddress: string, tokenId: string): Promise<{ name: string; description: string; image: string } | null> {
    try {
        console.log('='.repeat(60));
        console.log('🎨 NFT METADATA FETCHER');
        console.log('='.repeat(60));
        console.log(`Contract: ${contractAddress}`);
        console.log(`Token ID: ${tokenId}`);
        console.log('='.repeat(60));

        // Dynamic import to avoid SSR issues
        const { ethers } = await import('ethers');

        // Connect to Sepolia network (using public RPC)
        const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
        const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);

        console.log('✅ Connected to Sepolia network');

        // Create contract instance with minimal ERC721 ABI
        const contract = new ethers.Contract(
            contractAddress,
            ERC721_ABI,
            provider
        );

        // Get tokenURI
        console.log(`\n🔍 Fetching metadata for Token ID: ${tokenId}`);
        const tokenUri = await contract.tokenURI(tokenId);
        console.log(`📝 Token URI: ${tokenUri}`);

        let metadata: any;

        // Handle base64 encoded data URIs
        if (tokenUri.startsWith('data:application/json;base64,')) {
            const base64Data = tokenUri.replace('data:application/json;base64,', '');
            const decodedJson = atob(base64Data);
            metadata = JSON.parse(decodedJson);
            console.log('✅ Decoded base64 metadata');
        }
        // Handle IPFS URIs
        else if (tokenUri.startsWith('ipfs://')) {
            const httpUri = tokenUri.replace('ipfs://', 'https://ipfs.io/ipfs/');
            console.log(`📡 Fetching from IPFS: ${httpUri}`);
            const response = await fetch(httpUri);
            if (!response.ok) {
                throw new Error(`Failed to fetch IPFS metadata: ${response.status}`);
            }
            metadata = await response.json();
        }
        // Handle HTTP/HTTPS URIs
        else if (tokenUri.startsWith('http://') || tokenUri.startsWith('https://')) {
            console.log(`📡 Fetching from URL: ${tokenUri}`);
            const response = await fetch(tokenUri);
            if (!response.ok) {
                throw new Error(`Failed to fetch metadata: ${response.status}`);
            }
            metadata = await response.json();
        }
        else {
            throw new Error(`Unsupported token URI format: ${tokenUri}`);
        }

        console.log('\n📋 NFT Metadata:');
        console.log(JSON.stringify(metadata, null, 2));

        // Get image URL or embedded SVG
        let imageUrl = metadata.image || '';
        const imageData = metadata.image_data || '';

        const name = metadata.name || `Token #${tokenId}`;
        const description = metadata.description || 'No description';

        console.log(`\n📛 Name: ${name}`);
        console.log(`📄 Description: ${description.substring(0, 200)}${description.length > 200 ? '...' : ''}`);

        // Check if this is the NFTs2Me ownership token
        if (name.includes('NFTs2Me Collection Owner')) {
            console.log('\n⚠️  This is the NFTs2Me OWNERSHIP token, not your actual NFT collection!');

            // Extract collection address from attributes
            const collectionAddress = metadata.attributes?.find(
                (attr: any) => attr.trait_type === 'Collection Address'
            )?.value;

            if (collectionAddress) {
                console.log(`\n✨ Your actual NFT collection address is: ${collectionAddress}`);
                console.log(`💡 To view YOUR NFTs, use the collection address: ${collectionAddress}`);
            }
        }

        // Handle embedded SVG (image_data field)
        if (imageData && imageData.startsWith('<svg')) {
            console.log('\n🎨 This NFT uses embedded SVG data');
            const svgDataUri = `data:image/svg+xml;base64,${unicodeSafeBase64(imageData)}`;
            console.log('✅ Converted embedded SVG to data URI');

            return {
                name,
                description,
                image: svgDataUri
            };
        }

        // Handle image URL
        if (!imageUrl) {
            console.log('❌ No image found in metadata');
            return {
                name,
                description,
                image: getPlaceholderImage(contractAddress, tokenId)
            };
        }

        // Handle IPFS URLs
        if (imageUrl.startsWith('ipfs://')) {
            imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
            console.log('✅ Converted IPFS URL to HTTP');
        }

        console.log(`\n🖼️  Image URL: ${imageUrl}`);
        console.log('\n' + '='.repeat(60));
        console.log('✨ Done!');
        console.log('='.repeat(60));

        return {
            name,
            description,
            image: imageUrl
        };

    } catch (error: any) {
        console.error('❌ Error fetching NFT metadata:', error);
        console.log(`💡 You can try viewing the NFT directly on a block explorer`);

        // Return placeholder on error
        return {
            name: `Token #${tokenId}`,
            description: 'Failed to load metadata',
            image: getPlaceholderImage(contractAddress, tokenId)
        };
    }
}


/**
 * Approve an NFT for transfer to auction contract
 */
export async function approveNFT(signer: any, nftAddress: string, auctionAddress: string, tokenId: string) {
    const { ethers } = await import('ethers');

    const contract = new ethers.Contract(nftAddress, ERC721_ABI, signer);

    // Check if already approved
    const approved = await contract.getApproved(tokenId);
    if (approved.toLowerCase() === auctionAddress.toLowerCase()) {
        console.log('NFT already approved');
        return null;
    }

    // Approve the auction contract
    const tx = await contract.approve(auctionAddress, tokenId);
    return await tx.wait();
}

/**
 * Check if an NFT is approved for a specific operator
 */
export async function isNFTApproved(provider: any, nftAddress: string, tokenId: string, operatorAddress: string): Promise<boolean> {
    const { ethers } = await import('ethers');

    const contract = new ethers.Contract(nftAddress, ERC721_ABI, provider);

    try {
        const approved = await contract.getApproved(tokenId);
        if (approved.toLowerCase() === operatorAddress.toLowerCase()) {
            return true;
        }

        // Also check approvalForAll
        const owner = await contract.ownerOf(tokenId);
        const isApprovedAll = await contract.isApprovedForAll(owner, operatorAddress);
        return isApprovedAll;

    } catch (error) {
        console.error('Error checking approval:', error);
        return false;
    }
}
