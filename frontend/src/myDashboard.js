/**
 * My Dashboard - Shows user's auctions, bids, wins, and refunds
 */

import { ethers } from 'ethers';
import {
    setFactoryAddress,
    getDeployedAuctions,
    getAuctionInfo,
    getAuctionContract,
    AUCTION_TYPE_NAMES,
    AUCTION_TYPES,
    BASE_AUCTION_ABI
} from './factoryContext.js';
import { FACTORY_ADDRESS } from './config.js';
import { getNFTMetadata } from './nftContext.js';

// DOM Elements
const connectBtn = document.getElementById('connect-wallet-btn');
const promptConnectBtn = document.getElementById('prompt-connect-btn');
const walletInfo = document.getElementById('wallet-info');
const walletAddressSpan = document.getElementById('wallet-address');
const connectPrompt = document.getElementById('connect-prompt');
const dashboardContent = document.getElementById('dashboard-content');
const loadingOverlay = document.getElementById('loading-overlay');

// Stats
const myAuctionsCount = document.getElementById('my-auctions-count');
const activeBidsCount = document.getElementById('active-bids-count');
const winsCount = document.getElementById('wins-count');
const refundsCount = document.getElementById('refunds-count');

// Lists
const myAuctionsList = document.getElementById('my-auctions-list');
const activeBidsList = document.getElementById('active-bids-list');
const wonAuctionsList = document.getElementById('won-auctions-list');
const refundsList = document.getElementById('refunds-list');

// State
let provider;
let signer;
let userAddress;

async function init() {
    console.log("Initializing My Dashboard...");

    if (FACTORY_ADDRESS) {
        setFactoryAddress(FACTORY_ADDRESS);
    }

    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);

        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) {
            await connectWallet();
        }
    }

    connectBtn.addEventListener('click', connectWallet);
    promptConnectBtn.addEventListener('click', connectWallet);
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

        // Show dashboard, hide connect prompt
        connectPrompt.classList.add('hidden');
        dashboardContent.classList.remove('hidden');

        await loadDashboard();
    } catch (err) {
        console.error("Connection Error:", err);
        alert("Failed to connect wallet.");
    } finally {
        setLoading(false);
    }
}

async function loadDashboard() {
    if (!FACTORY_ADDRESS || !userAddress) return;

    try {
        setLoading(true);

        // Get all auctions
        const allAuctionAddresses = await getDeployedAuctions(provider);

        // Fetch info for each auction
        const allAuctions = await Promise.all(
            allAuctionAddresses.map(async (addr) => {
                const info = await getAuctionInfo(provider, addr);
                // Check if user has a bid
                const contract = new ethers.Contract(addr, [
                    "function bids(address) view returns (bytes32 encryptedAmount, uint256 escrowAmount, bool exists)",
                    "function winner() view returns (address)",
                    "function winnerRevealed() view returns (bool)",
                    "function refundClaimed(address) view returns (bool)",
                    "function getNFTInfo() view returns (bool isNFTAuction, address nftContractAddress, uint256 tokenId, bool claimed)"
                ], provider);

                let userBid = null;
                let isWinner = false;
                let canClaimRefund = false;
                let nftImage = null;

                try {
                    const bid = await contract.bids(userAddress);
                    if (bid.exists) {
                        userBid = {
                            escrowAmount: bid.escrowAmount,
                            exists: true
                        };

                        // Check if user is winner
                        const winner = await contract.winner();
                        isWinner = winner.toLowerCase() === userAddress.toLowerCase();

                        // Check if can claim refund (has bid, not winner, auction ended, not already claimed)
                        if (!isWinner && info.ended) {
                            try {
                                const claimed = await contract.refundClaimed(userAddress);
                                canClaimRefund = !claimed;
                            } catch {
                                canClaimRefund = true; // Assume can claim if function doesn't exist
                            }
                        }
                    }
                } catch (e) {
                    // No bid or different contract interface
                }

                // Fetch NFT image if it's an NFT auction
                if (info.hasNFT) {
                    try {
                        const [, nftContractAddr, tokenId] = await contract.getNFTInfo();
                        const metadata = await getNFTMetadata(provider, nftContractAddr, tokenId.toString());
                        nftImage = metadata?.image || null;
                    } catch (e) {
                        console.warn('NFT metadata fetch failed:', e);
                    }
                }

                return {
                    ...info,
                    userBid,
                    isWinner,
                    canClaimRefund,
                    nftImage
                };
            })
        );

        // Categorize
        const myAuctions = allAuctions.filter(a =>
            a.seller.toLowerCase() === userAddress.toLowerCase()
        );

        const activeBids = allAuctions.filter(a =>
            a.userBid?.exists && a.isActive
        );

        const wonAuctions = allAuctions.filter(a => a.isWinner);

        const refundsAvailable = allAuctions.filter(a => a.canClaimRefund);

        // Update stats
        myAuctionsCount.textContent = myAuctions.length.toString();
        activeBidsCount.textContent = activeBids.length.toString();
        winsCount.textContent = wonAuctions.length.toString();
        refundsCount.textContent = refundsAvailable.length.toString();

        // Render lists
        renderMyAuctions(myAuctions);
        renderActiveBids(activeBids);
        renderWonAuctions(wonAuctions);
        renderRefunds(refundsAvailable);

    } catch (err) {
        console.error("Error loading dashboard:", err);
    } finally {
        setLoading(false);
    }
}

function renderMyAuctions(auctions) {
    if (auctions.length === 0) {
        myAuctionsList.innerHTML = `
            <div class="empty-state">
                <p>You haven't created any auctions yet. <a href="/pages/create-auction.html">Create one!</a></p>
            </div>`;
        return;
    }

    myAuctionsList.innerHTML = auctions.map(a => {
        // Determine status
        let statusBadge, statusClass, actionBtn;

        if (a.hasNFT && !a.nftDeposited) {
            // NFT auction awaiting deposit
            statusBadge = '⏳ Pending Deposit';
            statusClass = 'pending';
            actionBtn = `<a href="/pages/auction-detail.html?address=${a.address}" class="btn btn-small btn-accent">Deposit NFT</a>`;
        } else if (a.isActive) {
            statusBadge = 'Live';
            statusClass = 'active';
            actionBtn = `<a href="/pages/auction-detail.html?address=${a.address}" class="btn btn-small btn-secondary">View</a>`;
        } else {
            statusBadge = 'Ended';
            statusClass = 'ended';
            actionBtn = `<a href="/pages/auction-detail.html?address=${a.address}" class="btn btn-small btn-secondary">View</a>`;
        }

        // NFT image thumbnail
        const nftThumbnail = a.nftImage
            ? `<img src="${a.nftImage}" alt="NFT" class="dashboard-nft-thumb" onerror="this.style.display='none'">`
            : '';

        return `
        <div class="dashboard-item glass-panel ${a.hasNFT ? 'has-nft' : ''}">
            ${nftThumbnail ? `<div class="item-nft-thumb">${nftThumbnail}</div>` : ''}
            <div class="item-info">
                <div class="item-title">${escapeHtml(a.title)}</div>
                <div class="item-meta">
                    <span class="type-badge">${getTypeBadge(a.auctionType)}</span>
                    <span class="status-badge ${statusClass}">${statusBadge}</span>
                    <span class="bidders">${a.bidderCount} bidder${a.bidderCount !== 1 ? 's' : ''}</span>
                </div>
            </div>
            <div class="item-actions">
                ${actionBtn}
            </div>
        </div>
    `}).join('');
}

function renderActiveBids(bids) {
    if (bids.length === 0) {
        activeBidsList.innerHTML = `
            <div class="empty-state">
                <p>No active bids. <a href="/pages/auctions.html">Browse auctions</a> to place bids!</p>
            </div>`;
        return;
    }

    activeBidsList.innerHTML = bids.map(a => `
        <div class="dashboard-item glass-panel">
            <div class="item-info">
                <div class="item-title">${escapeHtml(a.title)}</div>
                <div class="item-meta">
                    <span class="type-badge">${getTypeBadge(a.auctionType)}</span>
                    <span class="escrow">💰 ${ethers.formatEther(a.userBid.escrowAmount)} ETH escrowed</span>
                    <span class="time-left">⏰ ${getTimeRemaining(a.endTime)}</span>
                </div>
            </div>
            <div class="item-actions">
                <a href="/pages/auction-detail.html?address=${a.address}" class="btn btn-small btn-accent">View Bid</a>
            </div>
        </div>
    `).join('');
}

function renderWonAuctions(won) {
    if (won.length === 0) {
        wonAuctionsList.innerHTML = `
            <div class="empty-state">
                <p>No auctions won yet. Keep bidding! 🎯</p>
            </div>`;
        return;
    }

    wonAuctionsList.innerHTML = won.map(a => `
        <div class="dashboard-item glass-panel winner-item">
            <div class="item-info">
                <div class="item-title">🏆 ${escapeHtml(a.title)}</div>
                <div class="item-meta">
                    <span class="type-badge">${getTypeBadge(a.auctionType)}</span>
                    <span class="winner-badge">YOU WON!</span>
                </div>
            </div>
            <div class="item-actions">
                <a href="/pages/auction-detail.html?address=${a.address}" class="btn btn-small btn-success">Claim Prize</a>
            </div>
        </div>
    `).join('');
}

function renderRefunds(refunds) {
    if (refunds.length === 0) {
        refundsList.innerHTML = `
            <div class="empty-state">
                <p>No refunds available.</p>
            </div>`;
        return;
    }

    refundsList.innerHTML = refunds.map(a => `
        <div class="dashboard-item glass-panel refund-item">
            <div class="item-info">
                <div class="item-title">${escapeHtml(a.title)}</div>
                <div class="item-meta">
                    <span class="refund-amount">💰 ${ethers.formatEther(a.userBid.escrowAmount)} ETH</span>
                    <span class="refund-status">Ready to claim</span>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-small btn-accent" onclick="claimRefund('${a.address}')">Claim Refund</button>
            </div>
        </div>
    `).join('');
}

// Claim refund handler
window.claimRefund = async function (auctionAddress) {
    try {
        setLoading(true);
        const contract = new ethers.Contract(auctionAddress, BASE_AUCTION_ABI, signer);
        const tx = await contract.claimRefund();
        await tx.wait();
        alert('✅ Refund claimed successfully!');
        await loadDashboard();
    } catch (err) {
        console.error('Claim refund error:', err);
        alert('Failed to claim refund: ' + (err.shortMessage || err.message));
    } finally {
        setLoading(false);
    }
};

function getTypeBadge(type) {
    const icons = ['🔒', '🏆', '📉'];
    const names = AUCTION_TYPE_NAMES;
    return `${icons[type] || '📦'} ${names[type] || 'Unknown'}`;
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
