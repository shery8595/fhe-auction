/**
 * NFT Context - Alchemy API integration for fetching user NFTs
 * Supports Sepolia testnet
 */

// Alchemy API configuration
// User should replace with their own API key
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

/**
 * Safely encode string to base64, handling Unicode characters
 * @param {string} str - String to encode
 * @returns {string} Base64 encoded string
 */
function unicodeSafeBase64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode('0x' + p1);
    }));
}

/**
 * Fetch all NFTs owned by user on Sepolia
 * @param {string} ownerAddress - User's wallet address
 * @returns {Promise<Array>} Array of NFT objects
 */
export async function fetchUserNFTs(ownerAddress) {
    try {
        const url = `${ALCHEMY_BASE_URL}/getNFTsForOwner?owner=${ownerAddress}&withMetadata=true&pageSize=50`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Alchemy API error: ${response.status}`);
        }

        const data = await response.json();

        // Transform Alchemy response to our format
        const nfts = data.ownedNfts.map(nft => ({
            contractAddress: nft.contract.address,
            tokenId: nft.tokenId,
            name: nft.name || nft.raw?.metadata?.name || `Token #${nft.tokenId}`,
            description: nft.description || nft.raw?.metadata?.description || '',
            image: nft.image?.cachedUrl || nft.image?.originalUrl || nft.raw?.metadata?.image || '',
            collectionName: nft.contract.name || 'Unknown Collection',
            collectionSymbol: nft.contract.symbol || '',
            tokenType: nft.contract.tokenType || 'ERC721'
        }));

        // Filter to only ERC721 tokens
        return nfts.filter(nft => nft.tokenType === 'ERC721');

    } catch (error) {
        console.error('Error fetching NFTs:', error);

        // Fallback: return empty array
        return [];
    }
}

/**
 * Get NFT metadata from Alchemy API (primary) or contract directly (fallback)
 * @param {object} provider - Ethers provider
 * @param {string} contractAddress - NFT contract address
 * @param {string} tokenId - Token ID
 * @returns {Promise<object>} NFT metadata
 */
export async function getNFTMetadata(provider, contractAddress, tokenId) {
    const { ethers } = await import('ethers');

    // First, try Alchemy API (more reliable, handles CORS, caches images)
    try {
        const url = `${ALCHEMY_BASE_URL}/getNFTMetadata?contractAddress=${contractAddress}&tokenId=${tokenId}&refreshCache=false`;

        const response = await fetch(url);
        if (response.ok) {
            const nft = await response.json();

            // Extract image from various possible locations in Alchemy response
            // ✅ Check image_data FIRST (used by NFTs2Me for raw SVG)
            let image = nft.raw?.metadata?.image_data ||
                nft.image?.cachedUrl ||
                nft.image?.thumbnailUrl ||
                nft.image?.originalUrl ||
                nft.image?.pngUrl ||
                nft.raw?.metadata?.image ||
                nft.raw?.metadata?.image_url ||
                '';

            // If it's raw SVG (starts with <svg), convert to data URI
            if (image && !image.startsWith('data:') && !image.startsWith('http') && image.includes('<svg')) {
                image = `data:image/svg+xml;base64,${unicodeSafeBase64(image)}`;
                console.log('✅ Converted raw SVG to data URI');
            }

            // Convert IPFS URLs to HTTP
            if (image && image.startsWith('ipfs://')) {
                image = `https://ipfs.io/ipfs/${image.slice(7)}`;
            }

            // If still no image, use placeholder
            if (!image) {
                image = getPlaceholderImage(contractAddress, tokenId);
            }

            console.log('✅ Alchemy NFT metadata loaded:', {
                name: nft.name,
                hasImage: !!image,
                imageUrl: image?.substring(0, 50)
            });

            return {
                contractAddress,
                tokenId,
                name: nft.name || nft.raw?.metadata?.name || `Token #${tokenId}`,
                description: nft.description || nft.raw?.metadata?.description || '',
                image: image,
                collectionName: nft.contract?.name || 'Unknown',
                collectionSymbol: nft.contract?.symbol || ''
            };
        }
    } catch (alchemyError) {
        console.warn('Alchemy API failed, trying direct tokenURI:', alchemyError);
    }

    // Fallback: fetch directly from contract
    try {
        const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);

        const [name, symbol, tokenURI] = await Promise.all([
            contract.name().catch(() => 'Unknown'),
            contract.symbol().catch(() => ''),
            contract.tokenURI(tokenId).catch(() => '')
        ]);

        // Try to fetch metadata from tokenURI
        let image = '';
        let nftName = `${name} #${tokenId}`;
        let description = '';

        if (tokenURI) {
            try {
                let metadata;

                // Handle IPFS URLs
                let metadataUrl = tokenURI;
                if (tokenURI.startsWith('ipfs://')) {
                    metadataUrl = `https://ipfs.io/ipfs/${tokenURI.slice(7)}`;
                }

                // Handle data URIs (base64 encoded JSON)
                if (tokenURI.startsWith('data:application/json;base64,')) {
                    const base64Data = tokenURI.split(',')[1];
                    const jsonString = atob(base64Data);
                    metadata = JSON.parse(jsonString);
                } else if (tokenURI.startsWith('data:application/json')) {
                    // Plain JSON data URI
                    const jsonData = tokenURI.split(',')[1];
                    metadata = JSON.parse(decodeURIComponent(jsonData));
                } else {
                    // Fetch from URL
                    const metaResponse = await fetch(metadataUrl);
                    metadata = await metaResponse.json();
                }

                console.log('📦 NFT Metadata fetched:', {
                    name: metadata.name,
                    hasImage: !!metadata.image,
                    hasImageData: !!metadata.image_data,
                    hasImageUrl: !!metadata.image_url
                });

                nftName = metadata.name || nftName;
                description = metadata.description || '';

                // Handle different image fields (NFTs2Me uses image_data for SVG)
                if (metadata.image_data) {
                    // Raw SVG content - convert to data URI
                    image = `data:image/svg+xml;base64,${unicodeSafeBase64(metadata.image_data)}`;
                    console.log('✅ Got image from image_data (raw SVG)');
                } else if (metadata.image) {
                    image = metadata.image;
                    // Handle base64 SVG images
                    if (image.startsWith('data:image/svg+xml;base64,')) {
                        console.log('✅ Got base64 SVG image');
                    } else if (image.startsWith('data:image')) {
                        console.log('✅ Got data URI image');
                    } else if (image.startsWith('ipfs://')) {
                        image = `https://ipfs.io/ipfs/${image.slice(7)}`;
                        console.log('✅ Got IPFS image, converted to HTTP');
                    } else {
                        console.log('✅ Got image URL:', image.substring(0, 50));
                    }
                } else if (metadata.image_url) {
                    image = metadata.image_url;
                    console.log('✅ Got image from image_url');
                }

            } catch (e) {
                console.warn('Could not fetch token metadata:', e);
            }
        }

        // If still no image, use placeholder
        if (!image) {
            image = getPlaceholderImage(contractAddress, tokenId);
        }

        return {
            contractAddress,
            tokenId,
            name: nftName,
            description,
            image,
            collectionName: name,
            collectionSymbol: symbol
        };

    } catch (error) {
        console.error('Error getting NFT metadata:', error);
        return {
            contractAddress,
            tokenId,
            name: `Token #${tokenId}`,
            description: '',
            image: getPlaceholderImage(contractAddress, tokenId),
            collectionName: 'Unknown',
            collectionSymbol: ''
        };
    }
}

/**
 * Approve an NFT for transfer to auction contract
 * @param {object} signer - Ethers signer
 * @param {string} nftAddress - NFT contract address
 * @param {string} auctionAddress - Auction contract address to approve
 * @param {string} tokenId - Token ID to approve
 * @returns {Promise<object>} Transaction receipt
 */
export async function approveNFT(signer, nftAddress, auctionAddress, tokenId) {
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
 * @param {object} provider - Ethers provider
 * @param {string} nftAddress - NFT contract address
 * @param {string} tokenId - Token ID
 * @param {string} operatorAddress - Address to check approval for
 * @returns {Promise<boolean>} Whether approved
 */
export async function isNFTApproved(provider, nftAddress, tokenId, operatorAddress) {
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

/**
 * Format NFT display name
 * @param {object} nft - NFT object
 * @returns {string} Formatted display name
 */
export function formatNFTName(nft) {
    if (nft.name && !nft.name.startsWith('Token #')) {
        return nft.name;
    }
    return `${nft.collectionName} #${nft.tokenId}`;
}

/**
 * Get placeholder image for NFT without image
 * @param {string} contractAddress 
 * @param {string} tokenId 
 * @returns {string} Placeholder image URL
 */
export function getPlaceholderImage(contractAddress, tokenId) {
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
