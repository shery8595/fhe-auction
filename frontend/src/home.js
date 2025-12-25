/**
 * Home Page - Main landing page showing live and recent auctions
 */

import { ethers } from 'ethers';
import {
    setFactoryAddress,
    getDeployedAuctions,
    getActiveAuctions,
    getAuctionInfo,
    AUCTION_TYPE_NAMES
} from './factoryContext.js';
import { FACTORY_ADDRESS } from './config.js';
import { getNFTMetadata, getPlaceholderImage } from './nftContext.js';

// DOM Elements
const connectBtn = document.getElementById('connect-wallet-btn');
const walletInfo = document.getElementById('wallet-info');
const walletAddressSpan = document.getElementById('wallet-address');
const loadingOverlay = document.getElementById('loading-overlay');
const liveCount = document.getElementById('live-count');
const upcomingCount = document.getElementById('upcoming-count');
const endedCount = document.getElementById('ended-count');
const liveAuctionsGrid = document.getElementById('live-auctions-grid');
const recentAuctionsGrid = document.getElementById('recent-auctions-grid');

// State
let provider;
let signer;
let userAddress;
let allAuctions = [];

async function init() {
    console.log("Initializing Home Page...");

    if (FACTORY_ADDRESS) {
        setFactoryAddress(FACTORY_ADDRESS);
    }

    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);

        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) {
            await connectWallet();
        } else {
            // Load auctions even without wallet
            await loadAuctions();
        }
    } else {
        await loadAuctions();
    }

    connectBtn.addEventListener('click', connectWallet);
}

async function connectWallet() {
    try {
        setLoading(true);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();

        connectBtn.classList.add('hidden');
        walletInfo.classList.remove('hidden');
        walletAddressSpan.textContent = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;

        await loadAuctions();
    } catch (err) {
        console.error("Connection Error:", err);
    } finally {
        setLoading(false);
    }
}

async function loadAuctions() {
    if (!FACTORY_ADDRESS) {
        liveCount.textContent = '0';
        upcomingCount.textContent = '0';
        endedCount.textContent = '0';
        return;
    }

    try {
        setLoading(true);

        const readProvider = provider || new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/YOUR_KEY");

        const auctionAddresses = await getDeployedAuctions(readProvider);

        // Fetch info for each auction
        allAuctions = await Promise.all(
            auctionAddresses.map(addr => getAuctionInfo(readProvider, addr))
        );

        // Categorize
        const live = allAuctions.filter(a => a.isActive);
        const ended = allAuctions.filter(a => a.ended);
        const upcoming = allAuctions.filter(a => !a.isActive && !a.ended);

        // Update stats
        liveCount.textContent = live.length.toString();
        upcomingCount.textContent = upcoming.length.toString();
        endedCount.textContent = ended.length.toString();

        // Render grids
        renderAuctions(liveAuctionsGrid, live.slice(0, 3), "No live auctions");
        renderAuctions(recentAuctionsGrid, allAuctions.slice(0, 6), "No auctions yet");

    } catch (err) {
        console.error("Error loading auctions:", err);
    } finally {
        setLoading(false);
    }
}

async function renderAuctions(container, auctions, emptyMessage) {
    container.innerHTML = '';

    if (auctions.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>${emptyMessage}. <a href="/pages/create-auction.html">Create one!</a></p></div>`;
        return;
    }

    for (const auction of auctions) {
        const card = await createAuctionCard(auction);
        container.appendChild(card);
    }
}

async function createAuctionCard(auction) {
    const card = document.createElement('div');
    card.className = 'auction-card glass-panel';

    const typeIcon = ['🔒', '🏆', '📉'][auction.auctionType] || '📦';
    const typeName = AUCTION_TYPE_NAMES[auction.auctionType] || 'Unknown';
    const statusClass = auction.isActive ? 'active' : (auction.ended ? 'ended' : 'pending');
    const statusText = auction.isActive ? 'Live' : (auction.ended ? 'Ended' : 'Upcoming');

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

    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
    return `${h}h ${m}m`;
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
