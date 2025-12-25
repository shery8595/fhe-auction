/**
 * Create Auction Page - Submit auction requests
 * Now with NFT support
 */

import { ethers } from 'ethers';
import {
    setFactoryAddress,
    submitAuctionRequest,
    submitDutchRequest,
    AUCTION_TYPES
} from './factoryContext.js';
import { FACTORY_ADDRESS } from './config.js';
import { fetchUserNFTs, approveNFT, getPlaceholderImage, ERC721_ABI } from './nftContext.js';

// DOM Elements
const connectBtn = document.getElementById('connect-wallet-btn');
const walletInfo = document.getElementById('wallet-info');
const walletAddressSpan = document.getElementById('wallet-address');
const loadingOverlay = document.getElementById('loading-overlay');
const form = document.getElementById('create-auction-form');
const submitBtn = document.getElementById('submit-btn');
const standardPricing = document.getElementById('standard-pricing');
const dutchPricing = document.getElementById('dutch-pricing');
const typeOptions = document.querySelectorAll('input[name="auction-type"]');

// NFT Elements
const nftModeToggle = document.getElementById('nft-mode-toggle');
const nftSection = document.getElementById('nft-section');
const nftLoading = document.getElementById('nft-loading');
const nftEmpty = document.getElementById('nft-empty');
const nftGrid = document.getElementById('nft-grid');
const selectedNftSection = document.getElementById('selected-nft');
const selectedNftImage = document.getElementById('selected-nft-image');
const selectedNftName = document.getElementById('selected-nft-name');
const selectedNftCollection = document.getElementById('selected-nft-collection');
const selectedNftContract = document.getElementById('selected-nft-contract');
const selectedNftTokenId = document.getElementById('selected-nft-token-id');
const clearNftBtn = document.getElementById('clear-nft-btn');

// State
let provider;
let signer;
let userAddress;
let userNFTs = [];
let selectedNFT = null;

async function init() {
    console.log("Initializing Create Auction...");

    if (FACTORY_ADDRESS) {
        setFactoryAddress(FACTORY_ADDRESS);
    }

    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);

        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) {
            await connectWallet();
        }
    } else {
        alert("Please install MetaMask to use this app!");
    }

    connectBtn.addEventListener('click', connectWallet);
    form.addEventListener('submit', handleSubmit);

    // Toggle pricing fields based on auction type
    typeOptions.forEach(option => {
        option.addEventListener('change', handleTypeChange);
    });

    // NFT mode toggle
    if (nftModeToggle) {
        nftModeToggle.addEventListener('change', handleNFTModeToggle);
    }

    // Clear NFT button
    if (clearNftBtn) {
        clearNftBtn.addEventListener('click', clearSelectedNFT);
    }
}

async function connectWallet() {
    try {
        setLoading(true);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();

        // Update UI
        connectBtn.classList.add('hidden');
        walletInfo.classList.remove('hidden');
        walletAddressSpan.textContent = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;

        // Enable submit
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Auction Request';

    } catch (err) {
        console.error("Connection Error:", err);
        alert("Failed to connect wallet.");
    } finally {
        setLoading(false);
    }
}

function handleTypeChange(e) {
    const selectedType = parseInt(e.target.value);

    if (selectedType === AUCTION_TYPES.DUTCH) {
        standardPricing.classList.add('hidden');
        dutchPricing.classList.remove('hidden');
    } else {
        standardPricing.classList.remove('hidden');
        dutchPricing.classList.add('hidden');
    }
}

// ========================================
// NFT Functions
// ========================================

async function handleNFTModeToggle() {
    if (nftModeToggle.checked) {
        nftSection.classList.remove('hidden');

        if (!userAddress) {
            alert("Please connect wallet first to load your NFTs");
            nftModeToggle.checked = false;
            nftSection.classList.add('hidden');
            return;
        }

        await loadUserNFTs();
    } else {
        nftSection.classList.add('hidden');
        clearSelectedNFT();
    }
}

async function loadUserNFTs() {
    try {
        nftLoading.classList.remove('hidden');
        nftGrid.innerHTML = '';
        nftEmpty.classList.add('hidden');

        console.log('🔍 Fetching NFTs for:', userAddress);
        userNFTs = await fetchUserNFTs(userAddress);
        console.log('📦 Found NFTs:', userNFTs.length);

        nftLoading.classList.add('hidden');

        if (userNFTs.length === 0) {
            nftEmpty.classList.remove('hidden');
            return;
        }

        // Render NFT grid
        userNFTs.forEach((nft, index) => {
            const card = document.createElement('div');
            card.className = 'nft-card';
            card.dataset.index = index;

            const imageUrl = nft.image || getPlaceholderImage(nft.contractAddress, nft.tokenId);

            card.innerHTML = `
                <img src="${imageUrl}" alt="${nft.name}" onerror="this.src='${getPlaceholderImage(nft.contractAddress, nft.tokenId)}'">
                <div class="nft-card-info">
                    <span class="nft-card-name">${nft.name}</span>
                    <span class="nft-card-collection">${nft.collectionName}</span>
                </div>
            `;

            card.addEventListener('click', () => selectNFT(index));
            nftGrid.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading NFTs:', error);
        nftLoading.classList.add('hidden');
        nftEmpty.classList.remove('hidden');
        nftEmpty.innerHTML = '<p>Failed to load NFTs. Check console for details.</p>';
    }
}

function selectNFT(index) {
    selectedNFT = userNFTs[index];

    // Update selected card styling
    document.querySelectorAll('.nft-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelector(`.nft-card[data-index="${index}"]`).classList.add('selected');

    // Show selected NFT preview
    selectedNftSection.classList.remove('hidden');
    selectedNftImage.src = selectedNFT.image || getPlaceholderImage(selectedNFT.contractAddress, selectedNFT.tokenId);
    selectedNftName.textContent = selectedNFT.name;
    selectedNftCollection.textContent = selectedNFT.collectionName;
    selectedNftContract.value = selectedNFT.contractAddress;
    selectedNftTokenId.value = selectedNFT.tokenId;

    // Auto-fill auction title if empty
    const titleInput = document.getElementById('auction-title');
    if (!titleInput.value) {
        titleInput.value = selectedNFT.name;
    }

    // Auto-fill description if empty
    const descInput = document.getElementById('auction-description');
    if (!descInput.value && selectedNFT.description) {
        descInput.value = selectedNFT.description;
    }
}

function clearSelectedNFT() {
    selectedNFT = null;
    selectedNftSection.classList.add('hidden');
    document.querySelectorAll('.nft-card').forEach(card => {
        card.classList.remove('selected');
    });
}

// ========================================
// Form Submission
// ========================================

async function handleSubmit(e) {
    e.preventDefault();

    if (!signer) {
        alert("Please connect wallet first");
        return;
    }

    if (!FACTORY_ADDRESS) {
        alert("Factory contract not deployed yet. Deploy it first.");
        return;
    }

    try {
        setLoading(true);

        // Get form values
        const title = document.getElementById('auction-title').value.trim();
        const description = document.getElementById('auction-description').value.trim();
        const auctionType = parseInt(document.querySelector('input[name="auction-type"]:checked').value);
        const durationValue = parseInt(document.getElementById('duration-value').value);
        const durationUnit = parseInt(document.getElementById('duration-unit').value);
        const durationMinutes = durationValue * durationUnit;

        // NFT handling
        let nftContract = ethers.ZeroAddress;
        let nftTokenId = 0n; // Use BigInt for large token IDs

        if (nftModeToggle && nftModeToggle.checked && selectedNFT) {
            nftContract = selectedNFT.contractAddress;
            // Token IDs can be very large, use BigInt
            try {
                nftTokenId = BigInt(selectedNFT.tokenId);
            } catch {
                nftTokenId = BigInt(parseInt(selectedNFT.tokenId) || 0);
            }

            // We'll need to approve the NFT later when deploying
            // For now, just store the NFT info in the request
            console.log('📦 NFT selected:', nftContract, 'Token ID:', nftTokenId.toString());
        }

        let requestId;

        if (auctionType === AUCTION_TYPES.DUTCH) {
            // Dutch auction
            const startingPrice = document.getElementById('starting-price').value;
            const reservePrice = document.getElementById('reserve-price').value;
            const priceDecrement = document.getElementById('price-decrement').value;
            const decrementInterval = document.getElementById('decrement-interval').value;

            if (parseInt(startingPrice) <= parseInt(reservePrice)) {
                alert("Starting price must be greater than reserve price");
                setLoading(false);
                return;
            }

            requestId = await submitDutchRequest(
                signer,
                title,
                description,
                durationMinutes,
                startingPrice,
                reservePrice,
                priceDecrement,
                decrementInterval,
                nftContract,
                nftTokenId
            );
        } else {
            // First-Price or Vickrey
            const minimumBid = document.getElementById('minimum-bid').value;

            requestId = await submitAuctionRequest(
                signer,
                title,
                description,
                auctionType,
                durationMinutes,
                minimumBid,
                nftContract,
                nftTokenId
            );
        }

        let successMsg = `✅ Auction request submitted! Request ID: ${requestId}\n\nYour auction will go live once an admin approves it.`;

        if (selectedNFT) {
            successMsg += `\n\n📦 NFT: ${selectedNFT.name}\n⚠️ You'll need to approve the NFT transfer when the admin deploys the auction.`;
        }

        alert(successMsg);

        // Reset form
        form.reset();
        clearSelectedNFT();
        if (nftModeToggle) {
            nftModeToggle.checked = false;
            nftSection.classList.add('hidden');
        }

        // Redirect to auctions page
        setTimeout(() => {
            window.location.href = '/pages/auctions.html';
        }, 1500);

    } catch (err) {
        console.error("Submit Error:", err);
        alert("Failed to submit: " + (err.shortMessage || err.message));
    } finally {
        setLoading(false);
    }
}

function setLoading(isLoading) {
    if (isLoading) {
        loadingOverlay.classList.remove('hidden');
        submitBtn.disabled = true;
    } else {
        loadingOverlay.classList.add('hidden');
        if (signer) {
            submitBtn.disabled = false;
        }
    }
}

// Start
init();
