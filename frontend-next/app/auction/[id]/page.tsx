"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import Link from "next/link";
import { ethers } from "ethers";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading";
import { RevealOnScroll } from "@/components/ui/reveal-on-scroll";
import { ArrowLeft, Clock, User, TrendingUp, Lock, AlertCircle, CheckCircle, DollarSign, Trophy } from "lucide-react";
import { createEncryptedInput, isFHEReady } from "@/lib/fhevm";
import { formatEth, AUCTION_ABI } from "@/lib/contracts/auctionUtils";
import { getNFTMetadata, getPlaceholderImage } from "@/lib/nftUtils";

interface AuctionData {
    title: string;
    description: string;
    seller: string;
    auctionType: number;
    minimumBid: bigint;
    status: number;
    startTime: number;
    endTime: number;
    ended: boolean;
    bidderCount: number;
    isActive: boolean;
    timeRemaining: number;
    hasNFT: boolean;
    nftContract?: string;
    nftTokenId?: bigint;
    nftDeposited?: boolean;
}

export default function AuctionDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { address, isConnected } = useAccount();

    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [fheReady, setFheReady] = useState(false);
    const [auction, setAuction] = useState<AuctionData | null>(null);
    const [bidAmount, setBidAmount] = useState("");
    const [bidding, setBidding] = useState(false);
    const [depositingNFT, setDepositingNFT] = useState(false);
    const [nftMetadata, setNftMetadata] = useState<{ name: string; description: string; image: string } | null>(null);

    // Claim states
    const [claimingRefund, setClaimingRefund] = useState(false);
    const [claimingPrize, setClaimingPrize] = useState(false);
    const [claimingPayment, setClaimingPayment] = useState(false);
    const [reclaimingNFT, setReclaimingNFT] = useState(false);
    const [revealingWinner, setRevealingWinner] = useState(false);
    const [endingAuction, setEndingAuction] = useState(false);
    const [winnerAddress, setWinnerAddress] = useState<string | null>(null);
    const [reserveMet, setReserveMet] = useState(true);
    const [hasReservePrice, setHasReservePrice] = useState(false);

    const auctionAddress = id as string;

    useEffect(() => {
        setMounted(true);
    }, []);

    // Initialize FHE
    useEffect(() => {
        const initFHE = async () => {
            const ready = await isFHEReady();
            setFheReady(ready);
            if (ready) {
                console.log("✅ FHE initialized and ready");
            }
        };
        initFHE();
    }, []);

    // Fetch auction data
    useEffect(() => {
        const fetchAuctionData = async () => {
            if (!mounted || !auctionAddress) return;

            try {
                setLoading(true);

                if (!window.ethereum) {
                    console.error("No ethereum provider");
                    return;
                }

                const provider = new ethers.BrowserProvider(window.ethereum);
                const contract = new ethers.Contract(auctionAddress, AUCTION_ABI, provider);

                // Fetch metadata
                const metadata = await contract.getAuctionMetadata();

                // Fetch state
                const state = await contract.getAuctionState();

                // Fetch NFT info
                const nftInfo = await contract.getNFTInfo();

                // Check if active
                const isActive = await contract.isActive();

                // Get time remaining
                let timeRemaining = 0;
                try {
                    timeRemaining = Number(await contract.getTimeRemaining());
                } catch (e) {
                    // Auction might be ended
                }

                const auctionData: AuctionData = {
                    title: metadata.title,
                    description: metadata.description,
                    seller: metadata.auctionSeller,
                    auctionType: Number(metadata.aType),
                    minimumBid: metadata.minBid,
                    status: Number(state.aStatus),
                    startTime: Number(state.startTime),
                    endTime: Number(state.endTime),
                    ended: state.ended,
                    bidderCount: Number(state.bidderCount),
                    isActive,
                    timeRemaining,
                    hasNFT: nftInfo.isNFTAuction,
                    nftContract: nftInfo.nftContractAddress,
                    nftTokenId: nftInfo.tokenId,
                    nftDeposited: nftInfo.isNFTAuction ? await contract.nftDeposited() : false,
                };

                setAuction(auctionData);

                // Fetch winner info and reserve price status
                try {
                    const winnerRevealed = await contract.winnerRevealed();
                    if (winnerRevealed) {
                        const winner = await contract.winner();
                        setWinnerAddress(winner);
                    }

                    const hasReserve = await contract.hasReservePrice();
                    setHasReservePrice(hasReserve);

                    if (hasReserve) {
                        const reserveStatus = await contract.reserveMet();
                        setReserveMet(reserveStatus);
                    }
                } catch (e) {
                    console.log("Could not fetch winner/reserve info:", e);
                }

                // Fetch NFT metadata if this is an NFT auction
                if (nftInfo.isNFTAuction && nftInfo.nftContractAddress && nftInfo.tokenId) {
                    const metadata = await getNFTMetadata(
                        nftInfo.nftContractAddress,
                        nftInfo.tokenId.toString()
                    );
                    if (metadata) {
                        setNftMetadata(metadata);
                    }
                }
            } catch (error) {
                console.error("Error fetching auction data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAuctionData();
    }, [mounted, auctionAddress]);

    const handlePlaceBid = async () => {
        if (!fheReady) {
            alert("⏳ FHE not initialized yet. Please wait...");
            return;
        }

        if (!isConnected || !address) {
            alert("❌ Please connect your wallet first");
            return;
        }

        if (!bidAmount || parseFloat(bidAmount) <= 0) {
            alert("❌ Please enter a valid bid amount");
            return;
        }

        if (auction && parseFloat(bidAmount) < parseFloat(formatEth(auction.minimumBid))) {
            alert(`❌ Bid must be at least ${formatEth(auction.minimumBid)} ETH`);
            return;
        }

        try {
            setBidding(true);
            console.log("🔐 Creating encrypted bid...");

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // Create encrypted input
            const input = await createEncryptedInput(auctionAddress, address);
            const bidAmountWei = ethers.parseEther(bidAmount);
            input.add32(Number(bidAmountWei / BigInt(1e14))); // Convert to smaller unit for euint32

            const encryptedData = await input.encrypt();

            console.log("✅ Encrypted bid created");

            // Send transaction
            const contract = new ethers.Contract(auctionAddress, AUCTION_ABI, signer);
            const tx = await contract.placeBid(
                encryptedData.handles[0],
                encryptedData.inputProof,
                { value: bidAmountWei }
            );

            console.log("⏳ Waiting for transaction...");
            await tx.wait();

            console.log("✅ Bid placed successfully!");
            alert("✅ Bid submitted successfully!");

            setBidAmount("");

            // Refresh auction data instead of full page reload
            setLoading(true);
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const contract = new ethers.Contract(auctionAddress, AUCTION_ABI, provider);

                // Fetch updated metadata
                const metadata = await contract.getAuctionMetadata();

                // Fetch updated state
                const state = await contract.getAuctionState();

                // Fetch NFT info
                const nftInfo = await contract.getNFTInfo();

                // Check if active
                const isActive = await contract.isActive();

                // Get time remaining
                let timeRemaining = 0;
                try {
                    timeRemaining = Number(await contract.getTimeRemaining());
                } catch (e) {
                    // Auction might be ended
                }

                const auctionData: AuctionData = {
                    title: metadata.title,
                    description: metadata.description,
                    seller: metadata.auctionSeller,
                    auctionType: Number(metadata.aType),
                    minimumBid: metadata.minBid,
                    status: Number(state.aStatus),
                    startTime: Number(state.startTime),
                    endTime: Number(state.endTime),
                    ended: state.ended,
                    bidderCount: Number(state.bidderCount),
                    isActive,
                    timeRemaining,
                    hasNFT: nftInfo.isNFTAuction,
                    nftContract: nftInfo.nftContractAddress,
                    nftTokenId: nftInfo.tokenId,
                    nftDeposited: nftInfo.isNFTAuction ? await contract.nftDeposited() : false,
                };

                setAuction(auctionData);
            } catch (error) {
                console.error("Error refreshing auction data:", error);
            } finally {
                setLoading(false);
            }
        } catch (error: any) {
            console.error("❌ Error placing bid:", error);
            alert(`Error: ${error.shortMessage || error.message}`);
        } finally {
            setBidding(false);
        }
    };

    // Handle NFT deposit
    const handleDepositNFT = async () => {
        if (!auction || !isConnected || !address) {
            alert("Please connect your wallet");
            return;
        }

        if (auction.seller.toLowerCase() !== address.toLowerCase()) {
            alert("Only the seller can deposit the NFT");
            return;
        }

        if (!auction.hasNFT || auction.nftDeposited) {
            return;
        }

        try {
            setDepositingNFT(true);
            console.log("📦 Depositing NFT...");

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(auctionAddress, AUCTION_ABI, signer);

            const tx = await contract.depositNFT();
            console.log("⏳ Waiting for transaction...");
            await tx.wait();

            console.log("✅ NFT deposited successfully!");
            alert("✅ NFT deposited successfully! Bidding is now enabled.");

            // Refresh auction data
            window.location.reload();
        } catch (error: any) {
            console.error("❌ Error depositing NFT:", error);
            alert(`Failed to deposit NFT: ${error.message || "Unknown error"}`);
        } finally {
            setDepositingNFT(false);
        }
    };

    // Claim handler functions
    const handleClaimRefund = async () => {
        if (!isConnected || !address) {
            alert("❌ Please connect your wallet");
            return;
        }

        setClaimingRefund(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum as any);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(auctionAddress, AUCTION_ABI, signer);

            const tx = await contract.claimRefund();
            await tx.wait();

            alert("✅ Refund claimed successfully!");
            window.location.reload();
        } catch (error: any) {
            console.error("Error claiming refund:", error);
            alert(`❌ Failed to claim refund: ${error.message || "Unknown error"}`);
        } finally {
            setClaimingRefund(false);
        }
    };

    const handleClaimPrize = async () => {
        if (!isConnected || !address) {
            alert("❌ Please connect your wallet");
            return;
        }

        setClaimingPrize(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum as any);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(auctionAddress, AUCTION_ABI, signer);

            const tx = await contract.claimPrize();
            await tx.wait();

            alert("✅ Prize claimed successfully!");
            window.location.reload();
        } catch (error: any) {
            console.error("Error claiming prize:", error);
            alert(`❌ Failed to claim prize: ${error.message || "Unknown error"}`);
        } finally {
            setClaimingPrize(false);
        }
    };

    const handleClaimPayment = async () => {
        if (!isConnected || !address) {
            alert("❌ Please connect your wallet");
            return;
        }

        setClaimingPayment(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum as any);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(auctionAddress, AUCTION_ABI, signer);

            const tx = await contract.claimPayment();
            await tx.wait();

            alert("✅ Payment claimed successfully!");
            window.location.reload();
        } catch (error: any) {
            console.error("Error claiming payment:", error);
            alert(`❌ Failed to claim payment: ${error.message || "Unknown error"}`);
        } finally {
            setClaimingPayment(false);
        }
    };

    const handleReclaimNFT = async () => {
        if (!isConnected || !address) {
            alert("❌ Please connect your wallet");
            return;
        }

        setReclaimingNFT(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum as any);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(auctionAddress, AUCTION_ABI, signer);

            const tx = await contract.reclaimNFT();
            await tx.wait();

            alert("✅ NFT reclaimed successfully!");
            window.location.reload();
        } catch (error: any) {
            console.error("Error reclaiming NFT:", error);
            alert(`❌ Failed to reclaim NFT: ${error.message || "Unknown error"}`);
        } finally {
            setReclaimingNFT(false);
        }
    };

    const handleRevealWinner = async () => {
        if (!isConnected || !address) {
            alert("❌ Please connect your wallet");
            return;
        }

        setRevealingWinner(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum as any);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(auctionAddress, AUCTION_ABI, signer);

            console.log("🔍 Step 0: Verifying auction state...");

            // Check if auction has actually been ended
            const auctionEnded = await contract.auctionEnded();
            if (!auctionEnded) {
                alert("❌ The auction must be ended first before revealing the winner. Please click 'End Auction' button.");
                setRevealingWinner(false);
                return;
            }

            console.log("🔍 Step 1: Checking if any bids were placed...");

            // Check if there are any bids
            const state = await contract.getAuctionState();
            const bidderCount = Number(state.bidderCount);

            if (bidderCount === 0) {
                alert("❌ No bids were placed in this auction.");
                setRevealingWinner(false);
                return;
            }

            console.log(`✅ Found ${bidderCount} bidder(s)`);
            console.log("🔓 Step 2: Fetching encrypted winner data from blockchain...");

            // Fetch encrypted handles from the contract
            const encryptedWinnerIndex = await contract.getEncryptedWinnerIndex();
            const encryptedWinningBid = await contract.getEncryptedWinningBid();

            console.log("📦 Encrypted handles retrieved:");
            console.log("   Winner Index Handle:", encryptedWinnerIndex.toString());
            console.log("   Winning Bid Handle:", encryptedWinningBid.toString());

            console.log("🔐 Step 3: Decrypting via Zama Relayer (v0.9)...");

            // Import the decryption utility
            const { decryptAuctionWinner } = await import("@/lib/fheDecryption");

            // Convert BigInt handles to hex strings
            const indexHandle = ethers.toBeHex(encryptedWinnerIndex, 32);
            const bidHandle = ethers.toBeHex(encryptedWinningBid, 32);

            // Perform off-chain decryption using Zama Relayer
            const decryptionResult = await decryptAuctionWinner(indexHandle, bidHandle);

            console.log("✅ Decryption successful!");
            console.log("   Decrypted Winner Index:", decryptionResult.decryptedIndex);
            console.log("   Decrypted Winning Bid:", ethers.formatEther(decryptionResult.decryptedBid), "ETH");

            console.log("📝 Step 4: Submitting clear values + proof to contract...");

            // Call revealWinner with the decrypted values and proof
            const tx = await contract.revealWinner(
                decryptionResult.decryptedIndex,
                decryptionResult.decryptedBid,
                decryptionResult.abiEncodedClearValues,
                decryptionResult.decryptionProof
            );

            console.log("⏳ Waiting for transaction confirmation...");
            await tx.wait();

            console.log("✅ Winner revealed successfully!");
            alert("✅ Winner revealed! The contract has verified the decryption proof. Refreshing page...");
            window.location.reload();
        } catch (error: any) {
            console.error("❌ Error revealing winner:", error);

            // Provide more helpful error messages
            let errorMsg = "Unknown error";
            if (error.message?.includes("Auction not ended")) {
                errorMsg = "Auction has not ended yet";
            } else if (error.message?.includes("Already revealed")) {
                errorMsg = "Winner already revealed";
            } else if (error.message?.includes("Invalid index")) {
                errorMsg = "Invalid winner index - decryption proof verification failed";
            } else if (error.message?.includes("KMSInvalidSigner")) {
                errorMsg = "Decryption proof verification failed - invalid KMS signature";
            } else if (error.message?.includes("Relayer")) {
                errorMsg = "Failed to connect to Zama Relayer - please try again";
            } else {
                errorMsg = error.shortMessage || error.message || "Unknown error";
            }

            alert(`❌ Failed to reveal winner: ${errorMsg}`);
        } finally {
            setRevealingWinner(false);
        }
    };

    const handleEndAuction = async () => {
        if (!isConnected || !address) {
            alert("❌ Please connect your wallet");
            return;
        }

        setEndingAuction(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum as any);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(auctionAddress, AUCTION_ABI, signer);

            console.log("⏱️ Ending auction manually...");
            const tx = await contract.endAuction();
            await tx.wait();

            console.log("✅ Auction ended successfully!");
            alert("✅ Auction ended! Refreshing page...");
            window.location.reload();
        } catch (error: any) {
            console.error("Error ending auction:", error);
            alert(`❌ Failed to end auction: ${error.message || "Unknown error"}`);
        } finally {
            setEndingAuction(false);
        }
    };


    const formatTimeRemaining = (seconds: number) => {
        if (seconds <= 0) return "Ended";

        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    if (!mounted) {
        return <div className="min-h-screen" />;
    }

    return (
        <div className="min-h-screen pb-16">
            {/* Header */}
            <div className="container mx-auto px-4 pt-24 pb-12">
                <RevealOnScroll>
                    <Link
                        href="/auctions"
                        className="inline-flex items-center gap-2 text-white/60 hover:text-yellow-400 transition-colors mb-6"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Auctions
                    </Link>

                    {loading ? (
                        <div className="text-center py-16">
                            <LoadingSpinner size="lg" className="mx-auto mb-4" />
                            <p className="text-white/60">Loading auction...</p>
                        </div>
                    ) : !auction ? (
                        <Card className="glass-card text-center py-16">
                            <CardContent>
                                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                                <h2 className="text-2xl font-display font-bold text-white mb-2">
                                    Auction Not Found
                                </h2>
                                <p className="text-white/60 mb-6">
                                    The auction you're looking for doesn't exist or failed to load.
                                </p>
                                <Button onClick={() => router.push("/auctions")}>
                                    Browse Auctions
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {/* Hero Section */}
                            <div className="mb-10">
                                {/* NFT Image */}
                                {auction.hasNFT && nftMetadata?.image && (
                                    <div className="mb-8 max-w-md mx-auto lg:mx-0">
                                        <img
                                            src={nftMetadata.image}
                                            alt={nftMetadata.name || auction.title}
                                            className="w-full h-auto rounded-3xl shadow-2xl border border-white/10"
                                            onError={(e) => {
                                                // Fallback to placeholder if image fails to load
                                                const target = e.target as HTMLImageElement;
                                                target.src = getPlaceholderImage(
                                                    auction.nftContract || '',
                                                    auction.nftTokenId?.toString() || ''
                                                );
                                            }}
                                        />
                                    </div>
                                )}

                                <h1 className="text-4xl lg:text-6xl font-serif text-white tracking-tight mb-4">
                                    {auction.title}
                                </h1>
                                <div className="flex flex-wrap gap-2 mb-6">
                                    <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-[10px] font-black uppercase rounded-full border border-purple-500/20 tracking-widest">
                                        First-Price
                                    </span>
                                    {auction.hasNFT && (
                                        <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase rounded-full border border-blue-500/20 tracking-widest">
                                            NFT Auction
                                        </span>
                                    )}
                                    <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border tracking-widest flex items-center gap-1.5 ${auction.ended
                                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${auction.ended ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                                        {auction.ended ? 'Ended' : 'Active'}
                                    </span>
                                </div>
                                <p className="text-slate-400 text-lg leading-relaxed max-w-4xl">
                                    {auction.description || "No description provided for this auction."}
                                </p>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid md:grid-cols-4 gap-4 mb-12">
                                <Card className="glass-card">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <TrendingUp className="h-5 w-5 text-yellow-500" />
                                            <p className="text-sm text-white/60">Minimum Bid</p>
                                        </div>
                                        <p className="text-2xl font-bold text-yellow-500">
                                            {formatEth(auction.minimumBid)} ETH
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="glass-card">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <User className="h-5 w-5 text-blue-500" />
                                            <p className="text-sm text-white/60">Bidders</p>
                                        </div>
                                        <p className="text-2xl font-bold text-white">
                                            {auction.ended ? auction.bidderCount : (
                                                <span className="text-amber-500 text-lg flex items-center gap-2">
                                                    <Lock className="h-4 w-4" />
                                                    Hidden
                                                </span>
                                            )}
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="glass-card">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Clock className="h-5 w-5 text-green-500" />
                                            <p className="text-sm text-white/60">Time Remaining</p>
                                        </div>
                                        <p className="text-2xl font-bold text-white">
                                            {formatTimeRemaining(auction.timeRemaining)}
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="glass-card">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Lock className="h-5 w-5 text-purple-500" />
                                            <p className="text-sm text-white/60">FHE Status</p>
                                        </div>
                                        <p className="text-2xl font-bold text-white">
                                            {fheReady ? "✅ Ready" : "⏳ Loading"}
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Main Content Grid */}
                            <div className="grid lg:grid-cols-3 gap-8">
                                {/* Left Column - Bid Form */}
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Place Bid Card */}
                                    <RevealOnScroll>
                                        <Card className="glass-card">
                                            <CardHeader>
                                                <CardTitle className="text-white flex items-center gap-2">
                                                    <Lock className="h-6 w-6 text-yellow-500" />
                                                    Place Encrypted Bid
                                                </CardTitle>
                                            </CardHeader>

                                            <CardContent className="space-y-6">
                                                {/* FHE Info */}
                                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                                    <div className="flex items-start gap-3">
                                                        <Lock className="h-5 w-5 text-yellow-500 mt-0.5" />
                                                        <div>
                                                            <p className="font-semibold text-yellow-500 mb-1">
                                                                Zero-Knowledge Bidding
                                                            </p>
                                                            <p className="text-sm text-white/60">
                                                                Your bid is encrypted using Fully Homomorphic Encryption. No one can see your bid amount until the reveal phase.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* NFT Warning / Deposit */}
                                                {auction.hasNFT && !auction.nftDeposited && (
                                                    <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                                                        <div className="flex items-start gap-3">
                                                            <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                                                            <div className="flex-1">
                                                                <p className="font-semibold text-orange-500 mb-1">
                                                                    NFT Not Deposited
                                                                </p>
                                                                <p className="text-sm text-white/60 mb-3">
                                                                    {auction.seller.toLowerCase() === address?.toLowerCase()
                                                                        ? "You need to deposit the NFT to enable bidding."
                                                                        : "The seller hasn't deposited the NFT yet. Bidding is disabled until the NFT is deposited."}
                                                                </p>
                                                                {auction.seller.toLowerCase() === address?.toLowerCase() && (
                                                                    <Button
                                                                        onClick={handleDepositNFT}
                                                                        disabled={depositingNFT}
                                                                        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                                                                        size="sm"
                                                                    >
                                                                        {depositingNFT ? (
                                                                            <>
                                                                                <LoadingSpinner size="sm" className="mr-2" />
                                                                                Depositing NFT...
                                                                            </>
                                                                        ) : (
                                                                            "📦 Deposit NFT"
                                                                        )}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Bid Input */}
                                                <div className="space-y-2">
                                                    <Label htmlFor="bidAmount" className="text-white">
                                                        Bid Amount (ETH)
                                                    </Label>
                                                    <Input
                                                        id="bidAmount"
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder={`Minimum: ${formatEth(auction.minimumBid)} ETH`}
                                                        value={bidAmount}
                                                        onChange={(e) => setBidAmount(e.target.value)}
                                                        disabled={bidding || !auction.isActive || (auction.hasNFT && !auction.nftDeposited)}
                                                        className="text-lg"
                                                    />
                                                </div>
                                            </CardContent>

                                            <CardFooter>
                                                <Button
                                                    onClick={handlePlaceBid}
                                                    disabled={
                                                        !fheReady ||
                                                        !isConnected ||
                                                        bidding ||
                                                        !auction.isActive ||
                                                        (auction.hasNFT && !auction.nftDeposited)
                                                    }
                                                    className="w-full"
                                                    size="lg"
                                                >
                                                    {bidding ? (
                                                        <>
                                                            <LoadingSpinner size="sm" className="mr-2" />
                                                            Encrypting & Submitting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Lock className="h-5 w-5 mr-2" />
                                                            Place Encrypted Bid
                                                        </>
                                                    )}
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    </RevealOnScroll>

                                    {/* End Auction Button - Show when time expired but not ended on-chain */}
                                    {!auction.ended && auction.timeRemaining <= 0 && address && (
                                        <RevealOnScroll>
                                            <Card className="glass-card border-red-500/20">
                                                <CardHeader>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center">
                                                            <AlertCircle className="h-6 w-6 text-red-500" />
                                                        </div>
                                                        <CardTitle className="text-white text-xl">End Auction</CardTitle>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-white/60 mb-4">
                                                        ⚠️ Time has expired but the auction hasn't been ended on-chain yet. Click below to manually end the auction.
                                                    </p>
                                                </CardContent>
                                                <CardFooter>
                                                    <Button
                                                        onClick={handleEndAuction}
                                                        disabled={endingAuction}
                                                        className="w-full bg-red-500 hover:bg-red-400 text-white font-bold"
                                                        size="lg"
                                                    >
                                                        {endingAuction ? (
                                                            <>
                                                                <LoadingSpinner size="sm" className="mr-2" />
                                                                Ending...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <AlertCircle className="h-5 w-5 mr-2" />
                                                                End Auction Now
                                                            </>
                                                        )}
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        </RevealOnScroll>
                                    )}

                                    {/* Reveal Winner Button - Show when auction ended but winner not revealed */}
                                    {auction.ended && !winnerAddress && address && (
                                        <RevealOnScroll>
                                            <Card className="glass-card border-yellow-500/20">
                                                <CardHeader>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 bg-yellow-500/20 rounded-2xl flex items-center justify-center">
                                                            <Trophy className="h-6 w-6 text-yellow-500" />
                                                        </div>
                                                        <CardTitle className="text-white text-xl">Reveal Winner</CardTitle>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-white/60 mb-4">
                                                        The auction has ended. Click below to reveal the winner and allow bidders to claim their refunds or prizes.
                                                    </p>
                                                </CardContent>
                                                <CardFooter>
                                                    <Button
                                                        onClick={handleRevealWinner}
                                                        disabled={revealingWinner}
                                                        className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
                                                        size="lg"
                                                    >
                                                        {revealingWinner ? (
                                                            <>
                                                                <LoadingSpinner size="sm" className="mr-2" />
                                                                Revealing...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Trophy className="h-5 w-5 mr-2" />
                                                                Reveal Winner
                                                            </>
                                                        )}
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        </RevealOnScroll>
                                    )}

                                    {/* Claim Buttons - Show after auction ends and winner revealed */}
                                    {auction.ended && winnerAddress && (
                                        <>
                                            {/* Reserve Not Met Warning */}
                                            {hasReservePrice && !reserveMet && (
                                                <RevealOnScroll>
                                                    <div className="p-6 bg-orange-500/10 border border-orange-500/20 rounded-3xl mb-4">
                                                        <div className="flex items-start gap-3">
                                                            <AlertCircle className="h-6 w-6 text-orange-500 mt-1" />
                                                            <div>
                                                                <p className="font-bold text-orange-500 text-lg mb-2">
                                                                    ⚠️ Reserve Price Not Met
                                                                </p>
                                                                <p className="text-white/70 text-sm">
                                                                    The winning bid did not meet the seller's reserve price. No sale occurred.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </RevealOnScroll>
                                            )}

                                            {/* Loser View - Claim Refund */}
                                            {address && address.toLowerCase() !== winnerAddress.toLowerCase() && address.toLowerCase() !== auction.seller.toLowerCase() && (
                                                <RevealOnScroll>
                                                    <Card className="glass-card border-amber-500/20">
                                                        <CardHeader>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center">
                                                                    <DollarSign className="h-6 w-6 text-amber-500" />
                                                                </div>
                                                                <CardTitle className="text-white text-xl">Claim Your Refund</CardTitle>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent>
                                                            <p className="text-white/60 mb-4">
                                                                You didn't win this auction. Claim your full bid amount back.
                                                            </p>
                                                        </CardContent>
                                                        <CardFooter>
                                                            <Button
                                                                onClick={handleClaimRefund}
                                                                disabled={claimingRefund}
                                                                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold"
                                                                size="lg"
                                                            >
                                                                {claimingRefund ? (
                                                                    <>
                                                                        <LoadingSpinner size="sm" className="mr-2" />
                                                                        Claiming...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <DollarSign className="h-5 w-5 mr-2" />
                                                                        Claim Refund
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </CardFooter>
                                                    </Card>
                                                </RevealOnScroll>
                                            )}

                                            {/* Winner View - Claim Prize */}
                                            {address && address.toLowerCase() === winnerAddress.toLowerCase() && (!hasReservePrice || reserveMet) && (
                                                <RevealOnScroll>
                                                    <Card className="glass-card border-emerald-500/20">
                                                        <CardHeader>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                                                                    <Trophy className="h-6 w-6 text-emerald-500" />
                                                                </div>
                                                                <CardTitle className="text-white text-xl">🎉 You Won!</CardTitle>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent>
                                                            <p className="text-white/60 mb-4">
                                                                Congratulations! Claim your prize now.
                                                            </p>
                                                        </CardContent>
                                                        <CardFooter>
                                                            <Button
                                                                onClick={handleClaimPrize}
                                                                disabled={claimingPrize}
                                                                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
                                                                size="lg"
                                                            >
                                                                {claimingPrize ? (
                                                                    <>
                                                                        <LoadingSpinner size="sm" className="mr-2" />
                                                                        Claiming...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Trophy className="h-5 w-5 mr-2" />
                                                                        Claim Prize
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </CardFooter>
                                                    </Card>
                                                </RevealOnScroll>
                                            )}

                                            {/* Seller View - Claim Payment or Reclaim NFT */}
                                            {address && address.toLowerCase() === auction.seller.toLowerCase() && (
                                                <>
                                                    {(!hasReservePrice || reserveMet) ? (
                                                        <RevealOnScroll>
                                                            <Card className="glass-card border-blue-500/20">
                                                                <CardHeader>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                                                                            <DollarSign className="h-6 w-6 text-blue-500" />
                                                                        </div>
                                                                        <CardTitle className="text-white text-xl">Payment Ready</CardTitle>
                                                                    </div>
                                                                </CardHeader>
                                                                <CardContent>
                                                                    <p className="text-white/60 mb-4">
                                                                        Claim your payment from the winning bid.
                                                                    </p>
                                                                </CardContent>
                                                                <CardFooter>
                                                                    <Button
                                                                        onClick={handleClaimPayment}
                                                                        disabled={claimingPayment}
                                                                        className="w-full bg-blue-500 hover:bg-blue-400 text-black font-bold"
                                                                        size="lg"
                                                                    >
                                                                        {claimingPayment ? (
                                                                            <>
                                                                                <LoadingSpinner size="sm" className="mr-2" />
                                                                                Claiming...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <DollarSign className="h-5 w-5 mr-2" />
                                                                                Claim Payment
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </CardFooter>
                                                            </Card>
                                                        </RevealOnScroll>
                                                    ) : (
                                                        <RevealOnScroll>
                                                            <Card className="glass-card border-purple-500/20">
                                                                <CardHeader>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                                                                            <ArrowLeft className="h-6 w-6 text-purple-500" />
                                                                        </div>
                                                                        <CardTitle className="text-white text-xl">Reclaim NFT</CardTitle>
                                                                    </div>
                                                                </CardHeader>
                                                                <CardContent>
                                                                    <p className="text-white/60 mb-4">
                                                                        Reserve price not met. Reclaim your NFT.
                                                                    </p>
                                                                </CardContent>
                                                                <CardFooter>
                                                                    <Button
                                                                        onClick={handleReclaimNFT}
                                                                        disabled={reclaimingNFT}
                                                                        className="w-full bg-purple-500 hover:bg-purple-400 text-black font-bold"
                                                                        size="lg"
                                                                    >
                                                                        {reclaimingNFT ? (
                                                                            <>
                                                                                <LoadingSpinner size="sm" className="mr-2" />
                                                                                Reclaiming...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <ArrowLeft className="h-5 w-5 mr-2" />
                                                                                Reclaim NFT
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </CardFooter>
                                                            </Card>
                                                        </RevealOnScroll>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Right Column - Auction Info */}
                                <div className="space-y-6">
                                    {/* Seller Info */}
                                    <RevealOnScroll>
                                        <Card className="glass-card">
                                            <CardHeader>
                                                <CardTitle className="text-white text-lg">Seller</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="font-mono text-sm text-white/80 break-all">
                                                    {auction.seller}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </RevealOnScroll>

                                    {/* NFT Info */}
                                    {auction.hasNFT && (
                                        <RevealOnScroll>
                                            <Card className="glass-card border-blue-500/30">
                                                <CardHeader>
                                                    <CardTitle className="text-white text-lg flex items-center gap-2">
                                                        NFT Details
                                                        {auction.nftDeposited && (
                                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                                        )}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-3">
                                                    <div>
                                                        <p className="text-xs text-white/60 mb-1">Contract</p>
                                                        <p className="font-mono text-xs text-white/80 break-all">
                                                            {auction.nftContract}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-white/60 mb-1">Token ID</p>
                                                        <p className="text-white">{auction.nftTokenId?.toString()}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-white/60 mb-1">Status</p>
                                                        {auction.nftDeposited ? (
                                                            <Badge variant="success">Deposited</Badge>
                                                        ) : (
                                                            <Badge variant="warning">Not Deposited</Badge>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </RevealOnScroll>
                                    )}

                                    {/* Auction Details */}
                                    <RevealOnScroll>
                                        <Card className="glass-card">
                                            <CardHeader>
                                                <CardTitle className="text-white text-lg">Details</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-white/60">Contract</span>
                                                    <span className="font-mono text-xs text-white/80">
                                                        {auctionAddress.slice(0, 6)}...{auctionAddress.slice(-4)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-white/60">Start Time</span>
                                                    <span className="text-white">
                                                        {new Date(auction.startTime * 1000).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-white/60">End Time</span>
                                                    <span className="text-white">
                                                        {new Date(auction.endTime * 1000).toLocaleString()}
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </RevealOnScroll>
                                </div>
                            </div>
                        </div>
                    )}
                </RevealOnScroll>
            </div>
        </div>
    );
}
