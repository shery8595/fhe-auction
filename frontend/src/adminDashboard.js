/**
 * Admin Dashboard - Manage auction requests
 */

import { ethers } from 'ethers';
import {
    setFactoryAddress,
    getFactoryContract,
    getPendingRequests,
    getRequest,
    getDutchRequestDetails,
    getDeployedAuctions,
    getActiveAuctions,
    getAuctionInfo,
    registerAuction,
    rejectRequest,
    AUCTION_TYPE_NAMES,
    REQUEST_STATUS_NAMES,
    AUCTION_TYPES
} from './factoryContext.js';
import { FACTORY_ADDRESS } from './config.js';
import { CONTRACTS } from './contractsBytecode.js';

// DOM Elements
const connectBtn = document.getElementById('connect-wallet-btn');
const walletInfo = document.getElementById('wallet-info');
const walletAddressSpan = document.getElementById('wallet-address');
const loadingOverlay = document.getElementById('loading-overlay');
const refreshBtn = document.getElementById('refresh-btn');
const pendingList = document.getElementById('pending-list');
const noPending = document.getElementById('no-pending');
const auctionsTbody = document.getElementById('auctions-tbody');
const noAuctionsRow = document.getElementById('no-auctions-row');

// Stats
const pendingCount = document.getElementById('pending-count');
const approvedCount = document.getElementById('approved-count');
const activeCount = document.getElementById('active-count');

// State
let provider;
let signer;
let userAddress;

async function init() {
    console.log("Initializing Admin Dashboard...");

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
    refreshBtn.addEventListener('click', loadDashboard);
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

        await loadDashboard();

    } catch (err) {
        console.error("Connection Error:", err);
        alert("Failed to connect wallet.");
    } finally {
        setLoading(false);
    }
}

async function loadDashboard() {
    if (!FACTORY_ADDRESS) {
        pendingCount.textContent = '-';
        approvedCount.textContent = '-';
        activeCount.textContent = '-';
        showNoPending("Factory contract not deployed yet.");
        return;
    }

    try {
        setLoading(true);

        // Load pending requests
        const pendingIds = await getPendingRequests(provider);
        pendingCount.textContent = pendingIds.length.toString();

        // Load deployed auctions
        const deployedAddrs = await getDeployedAuctions(provider);
        approvedCount.textContent = deployedAddrs.length.toString();

        // Load active auctions
        const activeAddrs = await getActiveAuctions(provider);
        activeCount.textContent = activeAddrs.length.toString();

        // Render pending requests
        await renderPendingRequests(pendingIds);

        // Render auctions table
        await renderAuctionsTable(deployedAddrs);

    } catch (err) {
        console.error("Error loading dashboard:", err);
    } finally {
        setLoading(false);
    }
}

async function renderPendingRequests(pendingIds) {
    pendingList.innerHTML = '';

    if (pendingIds.length === 0) {
        const noPendingEl = document.createElement('div');
        noPendingEl.className = 'empty-state';
        noPendingEl.innerHTML = '<p>No pending requests. All caught up! 🎉</p>';
        pendingList.appendChild(noPendingEl);
        return;
    }

    for (const id of pendingIds) {
        const request = await getRequest(provider, id);
        const card = createRequestCard(request);
        pendingList.appendChild(card);
    }
}

function createRequestCard(request) {
    const card = document.createElement('div');
    card.className = 'request-card glass-panel';
    card.id = `request-${request.id}`;

    const typeIcon = ['🔒', '🏆', '📉'][request.auctionType] || '📦';
    const typeName = AUCTION_TYPE_NAMES[request.auctionType] || 'Unknown';
    const createdDate = new Date(request.createdAt * 1000).toLocaleString();

    card.innerHTML = `
        <div class="request-header">
            <h4>${escapeHtml(request.title)}</h4>
            <span class="type-badge">${typeIcon} ${typeName}</span>
        </div>
        <div class="request-body">
            <p class="request-description">${escapeHtml(request.description || 'No description')}</p>
            <div class="request-details">
                <span><strong>Seller:</strong> ${request.seller.substring(0, 8)}...</span>
                <span><strong>Duration:</strong> ${request.durationMinutes} min</span>
                <span><strong>Min Bid:</strong> ${request.minimumBid} wei</span>
                <span><strong>Submitted:</strong> ${createdDate}</span>
            </div>
        </div>
        <div class="request-actions">
            <button class="btn btn-success" onclick="handleApprove(${request.id})">✅ Approve</button>
            <button class="btn btn-danger" onclick="handleReject(${request.id})">❌ Reject</button>
        </div>
    `;

    return card;
}

async function renderAuctionsTable(auctionAddrs) {
    auctionsTbody.innerHTML = '';

    if (auctionAddrs.length === 0) {
        auctionsTbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No auctions deployed yet.</td></tr>';
        return;
    }

    for (const addr of auctionAddrs) {
        try {
            const info = await getAuctionInfo(provider, addr);
            const row = createAuctionRow(info);
            auctionsTbody.appendChild(row);
        } catch (err) {
            console.warn(`Error loading auction ${addr}:`, err);
        }
    }
}

function createAuctionRow(auction) {
    const row = document.createElement('tr');

    const typeName = AUCTION_TYPE_NAMES[auction.auctionType] || 'Unknown';
    const statusText = auction.isActive ? 'Active' : (auction.ended ? 'Ended' : 'Pending');
    const statusClass = auction.isActive ? 'status-active' : (auction.ended ? 'status-ended' : 'status-pending');

    row.innerHTML = `
        <td>${escapeHtml(auction.title)}</td>
        <td>${typeName}</td>
        <td>${auction.seller.substring(0, 8)}...</td>
        <td><span class="${statusClass}">${statusText}</span></td>
        <td>${auction.bidderCount}</td>
        <td>
            <a href="/pages/auction-detail.html?address=${auction.address}" class="btn btn-small btn-secondary">View</a>
        </td>
    `;

    return row;
}

// Modal elements
const approvalModal = document.getElementById('approval-modal');
const modalRequestId = document.getElementById('modal-request-id');
const modalAuctionType = document.getElementById('modal-auction-type');
const modalAuctionTitle = document.getElementById('modal-auction-title');
const modalAuctionDuration = document.getElementById('modal-auction-duration');
const auctionAddressInput = document.getElementById('auction-address-input');

let pendingApprovalRequestId = null;
let pendingApprovalRequest = null;

// Global handlers for button clicks
window.handleApprove = async function (requestId) {
    // Fetch request details
    const request = await getRequest(provider, requestId);
    pendingApprovalRequestId = requestId;
    pendingApprovalRequest = request;

    // Update modal with request info
    modalRequestId.textContent = `#${requestId}`;
    modalAuctionType.textContent = AUCTION_TYPE_NAMES[request.auctionType] || 'Unknown';
    modalAuctionTitle.textContent = request.title;
    modalAuctionDuration.textContent = `${request.durationMinutes} min`;
    auctionAddressInput.value = '';

    approvalModal.classList.remove('hidden');
};

window.closeApprovalModal = function () {
    approvalModal.classList.add('hidden');
    pendingApprovalRequestId = null;
    pendingApprovalRequest = null;
    auctionAddressInput.value = '';
};

// Deploy from browser and register
window.deployAndRegister = async function () {
    if (!pendingApprovalRequest) {
        alert('No pending request found. Please try again.');
        return;
    }

    // Save data before closing modal
    const request = pendingApprovalRequest;
    const requestId = pendingApprovalRequestId;
    const auctionType = Number(request.auctionType);

    // Hide modal but don't clear data yet
    approvalModal.classList.add('hidden');

    try {
        setLoading(true);

        // Fetch NFT details for this request
        const factory = getFactoryContract(provider);
        const [nftContract, nftTokenId] = await factory.getNFTRequestDetails(requestId);
        const hasNFT = nftContract !== ethers.ZeroAddress;

        console.log('📦 NFT details:', { hasNFT, nftContract, nftTokenId: nftTokenId.toString() });

        let contractData;
        let deployArgs;

        // Select contract based on auction type
        if (auctionType === 0) {
            // First-Price Auction
            contractData = CONTRACTS.firstPrice;
            deployArgs = [
                request.title,
                request.description,
                request.durationMinutes,
                request.minimumBid,
                request.seller,
                nftContract,
                nftTokenId
            ];
        } else if (auctionType === 1) {
            // Vickrey Auction
            contractData = CONTRACTS.vickrey;
            deployArgs = [
                request.title,
                request.description,
                request.durationMinutes,
                request.minimumBid,
                request.seller,
                nftContract,
                nftTokenId
            ];
        } else if (auctionType === 2) {
            // Dutch Auction - need to get extra details
            contractData = CONTRACTS.dutch;
            const dutchDetails = await getDutchRequestDetails(provider, pendingApprovalRequestId);
            deployArgs = [
                request.title,
                request.description,
                request.durationMinutes,
                dutchDetails.startingPrice,
                dutchDetails.reservePrice,
                dutchDetails.priceDecrement,
                dutchDetails.decrementInterval,
                request.seller,
                nftContract,
                nftTokenId
            ];
        } else {
            throw new Error('Unknown auction type');
        }

        console.log('Deploying auction with args:', deployArgs);

        // Deploy the contract
        const contractFactory = new ethers.ContractFactory(contractData.abi, contractData.bytecode, signer);
        const auction = await contractFactory.deploy(...deployArgs);

        console.log('Waiting for deployment...');
        await auction.waitForDeployment();

        const auctionAddress = await auction.getAddress();
        console.log('Auction deployed to:', auctionAddress);

        // Register with factory
        await registerAuction(signer, requestId, auctionAddress);

        if (hasNFT) {
            alert(`✅ Success!\n\nAuction deployed to: ${auctionAddress}\nRegistered with factory!\n\n⚠️ This is an NFT auction. The seller needs to visit the auction page and deposit their NFT before bidding can begin.`);
        } else {
            alert(`✅ Success!\n\nAuction deployed to: ${auctionAddress}\nRegistered with factory!`);
        }
        await loadDashboard();

    } catch (err) {
        console.error("Deploy error:", err);
        alert("Failed to deploy: " + (err.shortMessage || err.message));
    } finally {
        setLoading(false);
        // Clear the stored data
        pendingApprovalRequestId = null;
        pendingApprovalRequest = null;
        auctionAddressInput.value = '';
    }
};

window.confirmApproval = async function () {
    const auctionAddress = auctionAddressInput.value.trim();

    if (!auctionAddress) {
        auctionAddressInput.focus();
        return;
    }

    if (!auctionAddress.startsWith('0x') || auctionAddress.length !== 42) {
        alert('Invalid address format. Must be 0x followed by 40 hex characters.');
        auctionAddressInput.focus();
        return;
    }

    try {
        setLoading(true);
        closeApprovalModal();
        await registerAuction(signer, pendingApprovalRequestId, auctionAddress);
        alert(`✅ Request #${pendingApprovalRequestId} approved! Auction registered: ${auctionAddress}`);
        await loadDashboard();
    } catch (err) {
        console.error("Register error:", err);
        alert("Failed to register: " + (err.shortMessage || err.message));
    } finally {
        setLoading(false);
    }
};

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !approvalModal.classList.contains('hidden')) {
        closeApprovalModal();
    }
});

window.handleReject = async function (requestId) {
    if (!confirm(`Reject request #${requestId}? This cannot be undone.`)) {
        return;
    }

    try {
        setLoading(true);
        await rejectRequest(signer, requestId);
        alert(`Request #${requestId} rejected.`);
        await loadDashboard();
    } catch (err) {
        console.error("Reject error:", err);
        alert("Failed to reject: " + (err.shortMessage || err.message));
    } finally {
        setLoading(false);
    }
};

function showNoPending(message) {
    pendingList.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.innerHTML = `<p>${message}</p>`;
    pendingList.appendChild(div);
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
