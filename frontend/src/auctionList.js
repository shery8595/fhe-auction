/**
 * Auction List Page - Displays all approved auctions
 */

import { ethers } from 'ethers';
import {
    setFactoryAddress,
    getDeployedAuctions,
    getAuctionInfo,
    AUCTION_TYPE_NAMES,
    AUCTION_TYPES
} from './factoryContext.js';
import { FACTORY_ADDRESS } from './config.js';
import { getNFTMetadata, getPlaceholderImage } from './nftContext.js';

// DOM Elements
const connectBtn = document.getElementById('connect-wallet-btn');
const walletInfo = document.getElementById('wallet-info');
const walletAddressSpan = document.getElementById('wallet-address');
const loadingOverlay = document.getElementById('loading-overlay');
const auctionsGrid = document.getElementById('auctions-grid');
const emptyState = document.getElementById('empty-state');
const statusFilter = document.getElementById('status-filter');
const typeFilter = document.getElementById('type-filter');
const auctionCount = document.getElementById('auction-count');

// State
let provider;
let signer;
let userAddress;
let allAuctions = [];

async function init() {
    console.log("Initializing Auction List...");

    // Set factory address from config
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
    statusFilter.addEventListener('change', applyFilters);
    typeFilter.addEventListener('change', applyFilters);
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

        // Load auctions
        await loadAuctions();

    } catch (err) {
        console.error("Connection Error:", err);
        alert("Failed to connect wallet.");
    } finally {
        setLoading(false);
    }
}

async function loadAuctions() {
    if (!FACTORY_ADDRESS) {
        showEmptyState("Factory contract not deployed yet. Deploy it first.");
        return;
    }

    try {
        setLoading(true);

        const auctionAddresses = await getDeployedAuctions(provider);
        console.log("Found auctions:", auctionAddresses.length);

        if (auctionAddresses.length === 0) {
            showEmptyState("No auctions yet. Be the first to create one!");
            return;
        }

        // Fetch info for each auction
        allAuctions = await Promise.all(
            auctionAddresses.map(addr => getAuctionInfo(provider, addr))
        );

        applyFilters();

    } catch (err) {
        console.error("Error loading auctions:", err);
        showEmptyState("Error loading auctions. Check console for details.");
    } finally {
        setLoading(false);
    }
}

function applyFilters() {
    const statusValue = statusFilter.value;
    const typeValue = typeFilter.value;

    let filtered = [...allAuctions];

    // Filter out NFT auctions awaiting deposit (unless user is seller)
    filtered = filtered.filter(a => {
        // If not ready for public and user is NOT the seller, hide it
        if (!a.isReadyForPublic) {
            return userAddress && a.seller.toLowerCase() === userAddress.toLowerCase();
        }
        return true;
    });

    // Status filter
    if (statusValue === 'active') {
        filtered = filtered.filter(a => a.isActive);
    } else if (statusValue === 'ended') {
        filtered = filtered.filter(a => a.ended);
    }

    // Type filter
    if (typeValue !== 'all') {
        filtered = filtered.filter(a => a.auctionType === parseInt(typeValue));
    }

    renderAuctions(filtered);
    auctionCount.textContent = `${filtered.length} auction${filtered.length !== 1 ? 's' : ''}`;
}

async function renderAuctions(auctions) {
    // Clear grid but keep empty state template
    const emptyEl = emptyState.cloneNode(true);
    auctionsGrid.innerHTML = '';

    if (auctions.length === 0) {
        auctionsGrid.appendChild(emptyEl);
        emptyEl.classList.remove('hidden');
        return;
    }

    for (const auction of auctions) {
        const card = await createAuctionCard(auction);
        auctionsGrid.appendChild(card);
    }
}

async function createAuctionCard(auction) {
    const card = document.createElement('div');
    card.className = 'auction-card glass-panel';

    const typeIcon = ['🔒', '🏆', '📉'][auction.auctionType] || '📦';
    const typeName = AUCTION_TYPE_NAMES[auction.auctionType] || 'Unknown';
    const statusClass = auction.isActive ? 'active' : (auction.ended ? 'ended' : 'pending');
    const statusText = auction.isActive ? 'Active' : (auction.ended ? 'Ended' : 'Not Started');

    const timeRemaining = auction.isActive ? getTimeRemaining(auction.endTime) : '-';

    // Get NFT image if this is an NFT auction
    let nftImageHtml = '';
    if (auction.hasNFT && auction.nftContractAddress && auction.nftTokenId) {
        try {
            const metadata = await getNFTMetadata(provider, auction.nftContractAddress, auction.nftTokenId);
            const imageUrl = metadata.image || getPlaceholderImage(auction.nftContractAddress, auction.nftTokenId);
            nftImageHtml = `<div class="auction-card-image"><img src="${imageUrl}" alt="NFT" onerror="this.style.display='none'"></div>`;
        } catch (e) {
            const placeholderUrl = getPlaceholderImage(auction.nftContractAddress, auction.nftTokenId);
            nftImageHtml = `<div class="auction-card-image"><img src="${placeholderUrl}" alt="NFT"></div>`;
        }
    }

    card.innerHTML = `
        <div class="card-header">
            <span class="auction-type-badge">${typeIcon} ${typeName}</span>
            <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        ${nftImageHtml}
        <div class="card-body">
            <h3 class="auction-title">${escapeHtml(auction.title)}</h3>
            <p class="auction-description">${auction.hasNFT ? '🖼️ NFT Auction' : escapeHtml(auction.description || 'No description')}</p>
            <div class="auction-stats">
                <div class="stat">
                    <span class="stat-label">Min Bid</span>
                    <span class="stat-value">${auction.minimumBid} wei</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Bidders</span>
                    <span class="stat-value">${auction.bidderCount}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Time Left</span>
                    <span class="stat-value">${timeRemaining}</span>
                </div>
            </div>
        </div>
        <div class="card-footer">
            <a href="/pages/auction-detail.html?address=${auction.address}" class="btn btn-accent full-width">
                View Auction
            </a>
        </div>
    `;

    return card;
}

function getTimeRemaining(endTime) {
    const now = Math.floor(Date.now() / 1000);
    let diff = endTime - now;

    if (diff <= 0) return 'Ended';

    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);

    if (h > 24) {
        return `${Math.floor(h / 24)}d ${h % 24}h`;
    }
    return `${h}h ${m}m`;
}

function showEmptyState(message) {
    auctionsGrid.innerHTML = '';
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-state';
    emptyDiv.innerHTML = `
        <p>${message}</p>
        <a href="/pages/create-auction.html" class="btn btn-accent">Create Auction</a>
    `;
    auctionsGrid.appendChild(emptyDiv);
    auctionCount.textContent = '0 auctions';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setLoading(isLoading) {
    if (isLoading) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

// Start
init();
