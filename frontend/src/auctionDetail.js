/**
 * Auction Detail Page - View and bid on individual auctions
 * Supports First-Price, Vickrey (FHE encrypted), and Dutch auctions
 */

import { ethers } from 'ethers';
import {
    getAuctionContract,
    getAuctionInfo,
    AUCTION_TYPES,
    AUCTION_TYPE_NAMES,
    BASE_AUCTION_ABI,
    DUTCH_AUCTION_ABI,
    SEALED_AUCTION_ABI
} from './factoryContext.js';
import { getFHEInstance, encryptBidAmount, toHex, userDecrypt } from './fheContext.js';
import { NETWORK_ID } from './config.js';
import { approveNFT, getNFTMetadata, ERC721_ABI, getPlaceholderImage } from './nftContext.js';

// DOM Elements
const connectBtn = document.getElementById('connect-wallet-btn');
const walletInfo = document.getElementById('wallet-info');
const walletAddressSpan = document.getElementById('wallet-address');
const networkStatus = document.getElementById('network-status');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingMessage = document.getElementById('loading-message');
const errorState = document.getElementById('error-state');
const auctionContent = document.getElementById('auction-content');

// Auction info elements
const auctionTypeBadge = document.getElementById('auction-type-badge');
const auctionStatus = document.getElementById('auction-status');
const auctionTitle = document.getElementById('auction-title');
const auctionDescription = document.getElementById('auction-description');
const auctionSeller = document.getElementById('auction-seller');
const auctionMinBid = document.getElementById('auction-min-bid');
const auctionBidders = document.getElementById('auction-bidders');
const auctionTimer = document.getElementById('auction-timer');

// Dutch elements
const dutchPriceCard = document.getElementById('dutch-price-card');
const dutchCurrentPrice = document.getElementById('dutch-current-price');
const dutchNextDrop = document.getElementById('dutch-next-drop');
const dutchReserve = document.getElementById('dutch-reserve');
const dutchBidCard = document.getElementById('dutch-bid-card');
const dutchBidBtn = document.getElementById('dutch-bid-btn');
const dutchBuyPrice = document.getElementById('dutch-buy-price');

// Sealed bid elements
const sealedBidCard = document.getElementById('sealed-bid-card');
const bidForm = document.getElementById('bid-form');
const bidInput = document.getElementById('bid-amount');
const placeBidBtn = document.getElementById('place-bid-btn');

// Winner elements
const winnerCard = document.getElementById('winner-card');
const winnerAddress = document.getElementById('winner-address');
const winnerAmount = document.getElementById('winner-amount');

// NFT elements
const nftInfoCard = document.getElementById('nft-info-card');
const nftAuctionImage = document.getElementById('nft-auction-image');
const nftAuctionName = document.getElementById('nft-auction-name');
const nftAuctionContract = document.getElementById('nft-auction-contract');
const nftAuctionToken = document.getElementById('nft-auction-token');
const nftDepositIndicator = document.getElementById('nft-deposit-indicator');
const nftDepositCard = document.getElementById('nft-deposit-card');
const approveNftBtn = document.getElementById('approve-nft-btn');
const depositNftBtn = document.getElementById('deposit-nft-btn');
// Hero NFT image (replaces description for NFT auctions)
const nftHeroImage = document.getElementById('nft-hero-image');
const nftHeroImg = document.getElementById('nft-hero-img');
const auctionDescriptionEl = document.getElementById('auction-description');

// Reserve Price elements
const reservePriceCard = document.getElementById('reserve-price-card');
const reservePriceInput = document.getElementById('reserve-price-input');
const setReserveBtn = document.getElementById('set-reserve-btn');
const reserveStatus = document.getElementById('reserve-status');

// User status
const userStatusEl = document.getElementById('user-status');

// Action buttons
const actionsCard = document.getElementById('auction-actions-card');
const endAuctionBtn = document.getElementById('end-auction-btn');
const revealWinnerBtn = document.getElementById('reveal-winner-btn');
const claimRefundBtn = document.getElementById('claim-refund-btn');
const claimWinningsBtn = document.getElementById('claim-winnings-btn');

// State
let provider;
let signer;
let userAddress;
let auctionAddress;
let auctionData;
let auctionContract;
let timerInterval;
let nftInfo = null; // NFT auction info
let privacyInfo = null; // FHE privacy info

async function init() {
    console.log("Initializing Auction Detail...");

    // Get auction address from URL
    const params = new URLSearchParams(window.location.search);
    auctionAddress = params.get('address');

    if (!auctionAddress || !ethers.isAddress(auctionAddress)) {
        showError();
        return;
    }

    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);

        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) {
            await connectWallet();
        } else {
            // Load auction data even without wallet
            await loadAuctionData();
        }
    } else {
        await loadAuctionDataReadOnly();
    }

    connectBtn.addEventListener('click', connectWallet);
    bidForm.addEventListener('submit', handleBid);
    dutchBidBtn.addEventListener('click', handleDutchBid);
    endAuctionBtn.addEventListener('click', handleEndAuction);
    revealWinnerBtn.addEventListener('click', handleRevealWinner);
    claimRefundBtn.addEventListener('click', handleClaimRefund);
    claimWinningsBtn.addEventListener('click', handleClaimWinnings);

    // NFT buttons
    if (approveNftBtn) approveNftBtn.addEventListener('click', handleApproveNFT);
    if (depositNftBtn) depositNftBtn.addEventListener('click', handleDepositNFT);

    // Reserve price button
    if (setReserveBtn) setReserveBtn.addEventListener('click', handleSetReservePrice);
}

async function connectWallet() {
    try {
        setLoading(true, "Connecting wallet...");
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();

        // Check network
        const network = await provider.getNetwork();
        if (NETWORK_ID && network.chainId !== BigInt(NETWORK_ID)) {
            networkStatus.classList.remove('hidden');
            networkStatus.textContent = `Wrong Network`;
        } else {
            networkStatus.classList.add('hidden');
        }

        // Update UI
        connectBtn.classList.add('hidden');
        walletInfo.classList.remove('hidden');
        walletAddressSpan.textContent = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;

        // Initialize FHE for sealed auctions
        if (auctionData && auctionData.auctionType !== AUCTION_TYPES.DUTCH) {
            await initFHE();
        }

        // Load/refresh auction data
        await loadAuctionData();

        // Enable bid buttons
        updateBidButton();

    } catch (err) {
        console.error("Connection Error:", err);
        alert("Failed to connect wallet.");
    } finally {
        setLoading(false);
    }
}

async function initFHE() {
    try {
        await getFHEInstance();
        console.log("✅ FHE initialized");
    } catch (err) {
        console.warn("FHE initialization failed:", err);
    }
}

async function loadAuctionData() {
    try {
        setLoading(true, "Loading auction...");

        // Get auction info
        auctionData = await getAuctionInfo(provider, auctionAddress);

        // Create contract instance
        auctionContract = getAuctionContract(auctionAddress, auctionData.auctionType, signer || provider);

        // Update UI
        renderAuctionInfo();

        // Type-specific loading
        if (auctionData.auctionType === AUCTION_TYPES.DUTCH) {
            await loadDutchData();
        }

        // Load winner info
        await loadWinnerInfo();

        // Load NFT info (if NFT auction)
        await loadNFTInfo();

        // Load FHE privacy info (reserve price, bidder count)
        await loadPrivacyInfo();

        // Update user status
        await updateUserStatus();

        // Update action buttons
        updateActionButtons();

        // Show content
        auctionContent.classList.remove('hidden');

        // Start timer
        startTimer();

    } catch (err) {
        console.error("Error loading auction:", err);
        showError();
    } finally {
        setLoading(false);
    }
}

async function loadAuctionDataReadOnly() {
    try {
        const readProvider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/YOUR_INFURA_KEY");
        auctionData = await getAuctionInfo(readProvider, auctionAddress);
        renderAuctionInfo();
        auctionContent.classList.remove('hidden');
    } catch (err) {
        console.error("Error loading auction (read-only):", err);
        showError();
    }
}

function renderAuctionInfo() {
    const typeIcon = ['🔒', '🏆', '📉'][auctionData.auctionType] || '📦';
    const typeName = AUCTION_TYPE_NAMES[auctionData.auctionType] || 'Unknown';

    auctionTypeBadge.textContent = `${typeIcon} ${typeName}`;
    auctionTitle.textContent = auctionData.title || 'Untitled Auction';
    auctionDescription.textContent = auctionData.description || 'No description provided.';
    auctionSeller.textContent = `${auctionData.seller.substring(0, 8)}...${auctionData.seller.substring(38)}`;
    auctionMinBid.textContent = `${auctionData.minimumBid} wei`;
    auctionBidders.textContent = auctionData.bidderCount.toString();

    // Status
    if (auctionData.ended) {
        auctionStatus.textContent = 'Ended';
        auctionStatus.className = 'status-badge ended';
    } else if (auctionData.isActive) {
        auctionStatus.textContent = 'Active';
        auctionStatus.className = 'status-badge active';
    } else {
        auctionStatus.textContent = 'Pending';
        auctionStatus.className = 'status-badge pending';
    }

    // Show appropriate bid card
    if (auctionData.auctionType === AUCTION_TYPES.DUTCH) {
        sealedBidCard.classList.add('hidden');
        dutchBidCard.classList.remove('hidden');
        dutchPriceCard.classList.remove('hidden');
    } else {
        sealedBidCard.classList.remove('hidden');
        dutchBidCard.classList.add('hidden');
        dutchPriceCard.classList.add('hidden');
    }
}

async function loadDutchData() {
    try {
        const dutchContract = new ethers.Contract(auctionAddress, DUTCH_AUCTION_ABI, provider);
        const price = await dutchContract.getCurrentPrice();
        const [currentPrice, starting, reserve, decrement, interval, hasWinner] = await dutchContract.getDutchInfo();

        dutchCurrentPrice.textContent = currentPrice.toString();
        dutchBuyPrice.textContent = currentPrice.toString();
        dutchReserve.textContent = reserve.toString();

        // Calculate next drop time
        updateDutchTimer();

    } catch (err) {
        console.warn("Error loading Dutch data:", err);
    }
}

async function loadWinnerInfo() {
    try {
        const [winner, winningBid, isRevealed] = await auctionContract.getWinnerInfo();

        if (isRevealed && winner !== ethers.ZeroAddress) {
            winnerCard.classList.remove('hidden');
            winnerAddress.textContent = `${winner.substring(0, 8)}...${winner.substring(38)}`;
            winnerAmount.textContent = `${winningBid} wei`;
        } else {
            winnerCard.classList.add('hidden');
        }
    } catch (err) {
        console.warn("Error loading winner info:", err);
    }
}

async function updateUserStatus() {
    if (!userAddress) {
        userStatusEl.innerHTML = '<p class="status-message">Connect wallet to see your status.</p>';
        return;
    }

    try {
        // Check if user has bid
        const bid = await auctionContract.bids(userAddress);

        if (bid.exists) {
            let statusHtml = '<p class="status-message success">✅ You have placed a bid!</p>';
            statusHtml += `<p class="status-detail">Escrow: ${bid.escrowAmount} wei</p>`;

            // Check if winner
            const [winner, , isRevealed] = await auctionContract.getWinnerInfo();
            if (isRevealed && winner.toLowerCase() === userAddress.toLowerCase()) {
                statusHtml += '<p class="status-message highlight">🎉 Congratulations! You won!</p>';
            }

            userStatusEl.innerHTML = statusHtml;
        } else {
            userStatusEl.innerHTML = '<p class="status-message">You have not placed a bid yet.</p>';
        }

        // Check if user is seller
        if (auctionData.seller.toLowerCase() === userAddress.toLowerCase()) {
            userStatusEl.innerHTML += '<p class="status-detail">👤 You are the seller</p>';
        }

    } catch (err) {
        console.warn("Error updating user status:", err);
    }
}

function updateActionButtons() {
    actionsCard.classList.add('hidden');
    endAuctionBtn.classList.add('hidden');
    revealWinnerBtn.classList.add('hidden');
    claimRefundBtn.classList.add('hidden');
    claimWinningsBtn.classList.add('hidden');

    if (!auctionData) return;

    const now = Math.floor(Date.now() / 1000);
    const isTimeExpired = now >= auctionData.endTime;

    // End Auction button
    if (isTimeExpired && !auctionData.ended && auctionData.auctionType !== AUCTION_TYPES.DUTCH) {
        endAuctionBtn.classList.remove('hidden');
        actionsCard.classList.remove('hidden');
    }

    // Reveal Winner button (for sealed auctions)
    if (auctionData.ended && auctionData.auctionType !== AUCTION_TYPES.DUTCH) {
        // Check if already revealed
        auctionContract.getWinnerInfo().then(([, , isRevealed]) => {
            if (!isRevealed) {
                revealWinnerBtn.classList.remove('hidden');
                actionsCard.classList.remove('hidden');
            } else if (userAddress) {
                // Show claim buttons
                updateClaimButtons();
            }
        });
    }
}

async function updateClaimButtons() {
    if (!userAddress) return;

    try {
        const [winner, , isRevealed] = await auctionContract.getWinnerInfo();

        if (!isRevealed) return;

        // Check if user can claim refund
        const [canClaim] = await auctionContract.canClaimRefund(userAddress);
        if (canClaim) {
            claimRefundBtn.classList.remove('hidden');
            actionsCard.classList.remove('hidden');
        }

        // Check if user is seller
        if (auctionData.seller.toLowerCase() === userAddress.toLowerCase()) {
            const sellerClaimed = await auctionContract.sellerClaimed();
            if (!sellerClaimed) {
                claimWinningsBtn.classList.remove('hidden');
                actionsCard.classList.remove('hidden');
            }
        }

    } catch (err) {
        console.warn("Error updating claim buttons:", err);
    }
}

function updateBidButton() {
    if (!signer) {
        placeBidBtn.textContent = 'Connect Wallet to Bid';
        placeBidBtn.disabled = true;
        dutchBidBtn.disabled = true;
        return;
    }

    // Check if NFT auction is awaiting deposit
    if (nftInfo && !nftInfo.deposited) {
        placeBidBtn.textContent = 'Awaiting NFT Deposit';
        placeBidBtn.disabled = true;
        dutchBidBtn.textContent = 'Awaiting NFT Deposit';
        dutchBidBtn.disabled = true;
        return;
    }

    if (auctionData.ended || !auctionData.isActive) {
        placeBidBtn.textContent = 'Auction Ended';
        placeBidBtn.disabled = true;
        dutchBidBtn.textContent = 'Auction Ended';
        dutchBidBtn.disabled = true;
        return;
    }

    placeBidBtn.textContent = 'Place Encrypted Bid';
    placeBidBtn.disabled = false;
    dutchBidBtn.disabled = false;
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (!auctionData) return;

        // For NFT auctions awaiting deposit, show pending message
        if (nftInfo && !nftInfo.deposited) {
            auctionTimer.textContent = '⏳ Pending Deposit';
            auctionTimer.style.color = 'var(--highlight-color)';
            return;
        }

        // Reset color for normal countdown
        auctionTimer.style.color = '';

        const now = Math.floor(Date.now() / 1000);
        let diff = auctionData.endTime - now;

        if (diff <= 0) {
            auctionTimer.textContent = 'Ended';
            updateActionButtons();
            return;
        }

        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;

        auctionTimer.textContent = `${h}h ${m}m ${s}s`;

        // Update Dutch price periodically
        if (auctionData.auctionType === AUCTION_TYPES.DUTCH && diff % 5 === 0) {
            loadDutchData();
        }

    }, 1000);
}

function updateDutchTimer() {
    // This would calculate time to next price drop
    // For simplicity, showing approximate time
    dutchNextDrop.textContent = 'Soon';
}

// ========================================
// Bid Handlers
// ========================================

async function handleBid(e) {
    e.preventDefault();

    const amount = bidInput.value;
    if (!amount || parseInt(amount) <= 0) {
        alert("Please enter a valid bid amount");
        return;
    }

    if (!signer) {
        alert("Please connect wallet first");
        return;
    }

    // Check minimum bid
    if (auctionData && parseInt(amount) < auctionData.minimumBid) {
        alert(`Bid must be at least ${auctionData.minimumBid} wei (the minimum bid)`);
        return;
    }

    try {
        setLoading(true, "Initializing FHE encryption...");

        // ✅ Always use real FHE encryption - NO mock fallback!
        // encryptBidAmount will throw if FHE initialization fails
        console.log("📦 Creating encrypted input for contract:", auctionAddress);
        const encrypted = await encryptBidAmount(auctionAddress, userAddress, parseInt(amount));
        const handle = toHex(encrypted.handle);
        const proof = toHex(encrypted.proof);

        console.log("✅ Real FHE encryption complete");
        console.log("  Handle:", handle.substring(0, 20) + "...");
        console.log("  Handle length:", handle.length);
        console.log("  Proof length:", proof.length);

        // Verify we got real encryption (non-zero handle)
        if (handle === '0x' + '00'.repeat(32)) {
            throw new Error("FHE encryption returned zero handle - SDK may not be properly initialized");
        }

        setLoading(true, "Submitting encrypted bid...");

        console.log("📤 Sending placeBid transaction:");
        console.log("  Value:", amount, "wei");

        const tx = await auctionContract.placeBid(handle, proof, { value: amount });
        console.log("⏳ Transaction sent:", tx.hash);

        await tx.wait();
        console.log("✅ Transaction confirmed!");

        alert("✅ Bid placed successfully!");
        bidInput.value = '';

        await loadAuctionData();

    } catch (err) {
        console.error("❌ Bid Error:", err);

        // Try to extract more info from the error
        let errorMessage = err.shortMessage || err.message;

        if (err.data) {
            console.error("Error data:", err.data);
        }
        if (err.reason) {
            errorMessage = err.reason;
        }

        // FHE-specific error messages
        if (errorMessage.includes("RelayerSDK not loaded")) {
            errorMessage = "FHE SDK not loaded. Please refresh the page and try again.";
        } else if (errorMessage.includes("zero handle")) {
            errorMessage = "FHE encryption failed. The SDK may not be properly connected to the network.";
        } else if (errorMessage.includes("unknown custom error") || errorMessage.includes("0xb9688461")) {
            errorMessage = "FHE verification failed on-chain. Possible causes:\n" +
                "1. Wrong network (must be Zama Sepolia Devnet, chain 8009)\n" +
                "2. Relayer service unavailable\n" +
                "3. Invalid encryption proof\n\n" +
                "Check browser console for details.";
        }

        alert("Failed to place bid: " + errorMessage);
    } finally {
        setLoading(false);
    }
}

async function handleDutchBid() {
    if (!signer) {
        alert("Please connect wallet first");
        return;
    }

    try {
        setLoading(true, "Placing bid at current price...");

        const dutchContract = new ethers.Contract(auctionAddress, DUTCH_AUCTION_ABI, signer);
        const currentPrice = await dutchContract.getCurrentPrice();

        const tx = await dutchContract.placeBid(
            '0x' + '00'.repeat(32), // Not used for Dutch
            '0x',
            { value: currentPrice }
        );
        await tx.wait();

        alert("🎉 Congratulations! You won the auction!");
        await loadAuctionData();

    } catch (err) {
        console.error("Dutch Bid Error:", err);
        alert("Failed to bid: " + (err.shortMessage || err.message));
    } finally {
        setLoading(false);
    }
}

async function handleEndAuction() {
    if (!signer) {
        alert("Please connect wallet first");
        return;
    }

    try {
        setLoading(true, "Ending auction...");

        const tx = await auctionContract.endAuction();
        await tx.wait();

        alert("✅ Auction ended! Click 'Reveal Winner' to decrypt the results.");
        await loadAuctionData();

    } catch (err) {
        console.error("End Auction Error:", err);
        alert("Failed: " + (err.shortMessage || err.message));
    } finally {
        setLoading(false);
    }
}

async function handleRevealWinner() {
    if (!signer) {
        alert("Please connect wallet first");
        return;
    }

    try {
        setLoading(true, "Requesting decryption access...");

        // Request access first
        await auctionContract.requestResultAccess();

        setLoading(true, "Decrypting winner (requires signature)...");

        alert("You'll be asked to sign a message to decrypt the winner.");

        const encryptedIndex = await auctionContract.getEncryptedWinnerIndex();
        const encryptedBid = await auctionContract.getEncryptedWinningBid();

        const decryptedIndex = await userDecrypt(encryptedIndex.toString(), auctionAddress, signer);
        const decryptedBid = await userDecrypt(encryptedBid.toString(), auctionAddress, signer);

        setLoading(true, "Submitting reveal...");

        const tx = await auctionContract.revealWinner(decryptedIndex, decryptedBid, '0x');
        await tx.wait();

        alert("🎉 Winner revealed!");
        await loadAuctionData();

    } catch (err) {
        console.error("Reveal Error:", err);
        alert("Failed: " + (err.shortMessage || err.message));
    } finally {
        setLoading(false);
    }
}

async function handleClaimRefund() {
    if (!signer) return;

    try {
        setLoading(true, "Claiming refund...");

        const tx = await auctionContract.claimRefund();
        await tx.wait();

        alert("✅ Refund claimed successfully!");
        await loadAuctionData();

    } catch (err) {
        console.error("Claim Refund Error:", err);
        alert("Failed: " + (err.shortMessage || err.message));
    } finally {
        setLoading(false);
    }
}

async function handleClaimWinnings() {
    if (!signer) return;

    try {
        setLoading(true, "Claiming winnings...");

        const tx = await auctionContract.sellerClaimWinnings();
        await tx.wait();

        alert("✅ Winnings claimed successfully!");
        await loadAuctionData();

    } catch (err) {
        console.error("Claim Winnings Error:", err);
        alert("Failed: " + (err.shortMessage || err.message));
    } finally {
        setLoading(false);
    }
}

// ========================================
// Utilities
// ========================================

function showError() {
    errorState.classList.remove('hidden');
    auctionContent.classList.add('hidden');
    loadingOverlay.classList.add('hidden');
}

function setLoading(isLoading, message = 'Loading...') {
    if (isLoading) {
        loadingOverlay.classList.remove('hidden');
        loadingMessage.textContent = message;
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

// ========================================
// NFT Functions
// ========================================

async function loadNFTInfo() {
    try {
        // Check if auction has NFT
        const [isNFT, nftContractAddr, tokenId, claimed] = await auctionContract.getNFTInfo();

        if (!isNFT) {
            // Not an NFT auction
            if (nftInfoCard) nftInfoCard.classList.add('hidden');
            if (nftDepositCard) nftDepositCard.classList.add('hidden');
            return;
        }

        // Check if NFT is deposited
        const isDeposited = await auctionContract.nftDeposited();

        nftInfo = {
            contractAddress: nftContractAddr,
            tokenId: tokenId.toString(),
            claimed,
            deposited: isDeposited
        };

        // Show NFT info card
        if (nftInfoCard) {
            nftInfoCard.classList.remove('hidden');
            nftAuctionContract.textContent = `Contract: ${nftContractAddr.substring(0, 10)}...${nftContractAddr.substring(38)}`;
            nftAuctionToken.textContent = `Token ID: ${tokenId.toString()}`;

            // Try to get metadata
            try {
                const metadata = await getNFTMetadata(provider, nftContractAddr, tokenId.toString());
                nftAuctionName.textContent = metadata.name;

                const imageUrl = metadata.image || getPlaceholderImage(nftContractAddr, tokenId.toString());

                // Set the small NFT card image
                if (nftAuctionImage) {
                    nftAuctionImage.src = imageUrl;
                    nftAuctionImage.style.display = 'block';
                    nftAuctionImage.onerror = () => {
                        nftAuctionImage.src = getPlaceholderImage(nftContractAddr, tokenId.toString());
                    };
                }

                // Set the hero NFT image (replaces description)
                if (nftHeroImage && nftHeroImg) {
                    nftHeroImg.src = imageUrl;
                    nftHeroImg.onerror = () => {
                        nftHeroImg.src = getPlaceholderImage(nftContractAddr, tokenId.toString());
                    };
                    nftHeroImage.classList.remove('hidden');
                    // Hide the text description for NFT auctions
                    if (auctionDescriptionEl) {
                        auctionDescriptionEl.classList.add('hidden');
                    }
                }

            } catch (e) {
                console.warn('NFT metadata error:', e);
                nftAuctionName.textContent = `NFT #${tokenId.toString()}`;
                const placeholderUrl = getPlaceholderImage(nftContractAddr, tokenId.toString());
                if (nftAuctionImage) {
                    nftAuctionImage.src = placeholderUrl;
                    nftAuctionImage.style.display = 'block';
                }
                if (nftHeroImage && nftHeroImg) {
                    nftHeroImg.src = placeholderUrl;
                    nftHeroImage.classList.remove('hidden');
                    if (auctionDescriptionEl) {
                        auctionDescriptionEl.classList.add('hidden');
                    }
                }
            }

            // Update deposit status indicator
            if (nftDepositIndicator) {
                if (isDeposited) {
                    nftDepositIndicator.textContent = '✅ NFT deposited and in escrow';
                    nftDepositIndicator.className = 'deposit-indicator deposited';
                } else {
                    nftDepositIndicator.textContent = '⏳ Awaiting NFT deposit from seller';
                    nftDepositIndicator.className = 'deposit-indicator pending';
                }
            }
        }

        // Show deposit card if user is seller and NFT not deposited
        if (nftDepositCard && userAddress) {
            const seller = await auctionContract.seller();
            if (userAddress.toLowerCase() === seller.toLowerCase() && !isDeposited) {
                nftDepositCard.classList.remove('hidden');
            } else {
                nftDepositCard.classList.add('hidden');
            }
        }

    } catch (err) {
        console.warn("Error loading NFT info:", err);
    }
}

async function handleApproveNFT() {
    if (!signer || !nftInfo) {
        alert("Please connect wallet first");
        return;
    }

    try {
        setLoading(true, "Approving NFT for transfer...");

        const nftContract = new ethers.Contract(nftInfo.contractAddress, ERC721_ABI, signer);
        const tx = await nftContract.approve(auctionAddress, nftInfo.tokenId);
        await tx.wait();

        alert("✅ NFT approved! Now click 'Deposit NFT' to transfer it to escrow.");

        // Enable deposit button
        if (depositNftBtn) {
            depositNftBtn.disabled = false;
        }
        if (approveNftBtn) {
            approveNftBtn.textContent = '✅ Approved';
            approveNftBtn.disabled = true;
        }

    } catch (err) {
        console.error("Approve error:", err);
        alert("Failed to approve: " + (err.shortMessage || err.message));
    } finally {
        setLoading(false);
    }
}

async function handleDepositNFT() {
    if (!signer || !nftInfo) {
        alert("Please connect wallet first");
        return;
    }

    try {
        setLoading(true, "Depositing NFT to escrow...");

        const tx = await auctionContract.depositNFT();
        await tx.wait();

        alert("🎉 NFT deposited successfully! Bidding is now enabled.");

        // Refresh data
        await loadAuctionData();

    } catch (err) {
        console.error("Deposit error:", err);

        if (err.message && err.message.includes("ERC721")) {
            alert("Failed to deposit: Please make sure you approved the NFT first.");
        } else {
            alert("Failed to deposit: " + (err.shortMessage || err.message));
        }
    } finally {
        setLoading(false);
    }
}

// ========================================
// Reserve Price Functions
// ========================================

async function loadPrivacyInfo() {
    try {
        if (!auctionContract) return;

        const [hasReserve, isReserveMet, bidderCountHidden] = await auctionContract.getPrivacyInfo();
        privacyInfo = { hasReserve, isReserveMet, bidderCountHidden };

        // Show reserve price card if seller, no reserve set, no bids yet
        if (reservePriceCard && userAddress && auctionData) {
            const isSeller = auctionData.seller.toLowerCase() === userAddress.toLowerCase();
            const noBids = auctionData.bidderCount === 0;

            if (isSeller && !hasReserve && noBids && !auctionData.ended) {
                reservePriceCard.classList.remove('hidden');
                if (reserveStatus) reserveStatus.classList.add('hidden');
            } else if (isSeller && hasReserve) {
                // Show status that reserve is set
                reservePriceCard.classList.remove('hidden');
                if (reserveStatus) {
                    reserveStatus.classList.remove('hidden');
                }
                const formEl = reservePriceCard.querySelector('.reserve-form');
                if (formEl) formEl.classList.add('hidden');
            } else {
                reservePriceCard.classList.add('hidden');
            }
        }
    } catch (err) {
        console.warn("Error loading privacy info:", err);
    }
}

async function handleSetReservePrice() {
    if (!signer) {
        alert("Please connect wallet first");
        return;
    }

    const reserveAmount = reservePriceInput?.value;
    if (!reserveAmount || parseInt(reserveAmount) <= 0) {
        alert("Please enter a valid reserve price");
        return;
    }

    try {
        setLoading(true, "Encrypting reserve price...");

        // Encrypt the reserve price
        const encrypted = await encryptBidAmount(auctionAddress, userAddress, parseInt(reserveAmount));
        const handle = toHex(encrypted.handle);
        const proof = toHex(encrypted.proof);

        setLoading(true, "Setting encrypted reserve...");

        const tx = await auctionContract.setReservePrice(handle, proof);
        await tx.wait();

        alert("🔐 Reserve price set! This is encrypted and hidden from all bidders.");

        // Update UI
        await loadPrivacyInfo();

    } catch (err) {
        console.error("Set reserve error:", err);
        alert("Failed to set reserve: " + (err.shortMessage || err.message));
    } finally {
        setLoading(false);
    }
}

// Start
init();
