"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import Link from "next/link";
import { ethers } from "ethers";
import { LoadingSpinner } from "@/components/ui/loading";
import {
    ArrowLeft,
    Clock,
    User,
    TrendingUp,
    Lock,
    AlertCircle,
    CheckCircle,
    Users,
    ShieldCheck,
    Fingerprint,
    Image as ImageIcon
} from "lucide-react";
import { createEncryptedInput, isFHEReady } from "@/lib/fhevm";
import { formatEth, AUCTION_ABI } from "@/lib/contracts/auctionUtils";

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

const StatCard = ({ label, value, icon: Icon, colorClass }: { label: string, value: string | number, icon: any, colorClass: string }) => (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] transition-all group">
        <div className="flex items-center gap-2 mb-4">
            <Icon className={colorClass} size={14} />
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
        </div>
        <div className="text-2xl font-bold text-white group-hover:scale-105 transition-transform origin-left tracking-tight">
            {value}
        </div>
    </div>
);

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

                const metadata = await contract.getAuctionMetadata();
                const state = await contract.getAuctionState();
                const nftInfo = await contract.getNFTInfo();
                const isActive = await contract.isActive();

                let timeRemaining = 0;
                try {
                    timeRemaining = Number(await contract.getTimeRemaining());
                } catch (e) {
                    // Auction ended
                }

                let nftDeposited = false;
                if (nftInfo.isNFTAuction) {
                    try {
                        nftDeposited = await contract.nftDeposited();
                    } catch (e) {
                        console.error("Error checking NFT deposit:", e);
                    }
                }

                setAuction({
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
                    nftDeposited,
                });
            } catch (error) {
                console.error("Error fetching auction data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAuctionData();
    }, [mounted, auctionAddress]);

    // Handle bid placement
    const handlePlaceBid = async () => {
        if (!fheReady) {
            alert("⏳ FHE is still initializing. Please wait...");
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

            const input = await createEncryptedInput(auctionAddress, address);
            const bidAmountWei = ethers.parseEther(bidAmount);
            input.add32(Number(bidAmountWei / BigInt(1e14)));

            const encryptedData = await input.encrypt();

            console.log("✅ Encrypted bid created");

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

            // Refresh auction data
            setLoading(true);
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const contract = new ethers.Contract(auctionAddress, AUCTION_ABI, provider);

                const metadata = await contract.getAuctionMetadata();
                const state = await contract.getAuctionState();
                const nftInfo = await contract.getNFTInfo();
                const isActive = await contract.isActive();

                let timeRemaining = 0;
                try {
                    timeRemaining = Number(await contract.getTimeRemaining());
                } catch (e) {
                    // Auction ended
                }

                let nftDeposited = false;
                if (nftInfo.isNFTAuction) {
                    try {
                        nftDeposited = await contract.nftDeposited();
                    } catch (e) {
                        console.error("Error checking NFT deposit:", e);
                    }
                }

                setAuction({
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
                    nftDeposited,
                });
            } catch (error) {
                console.error("Error refreshing auction data:", error);
            } finally {
                setLoading(false);
            }
        } catch (error: any) {
            console.error("❌ Error placing bid:", error);
            alert(`Failed to place bid: ${error.message || "Unknown error"}`);
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

            window.location.reload();
        } catch (error: any) {
            console.error("❌ Error depositing NFT:", error);
            alert(`Failed to deposit NFT: ${error.message || "Unknown error"}`);
        } finally {
            setDepositingNFT(false);
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
        return <div className="min-h-screen bg-[#0a0a0a]" />;
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] pb-16">
            <div className="container mx-auto px-4 pt-24 pb-12 max-w-6xl">
                <button
                    onClick={() => router.push("/auctions")}
                    className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm mb-6 group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Auctions
                </button>

                {loading ? (
                    <div className="text-center py-16">
                        <LoadingSpinner size="lg" className="mx-auto mb-4" />
                        <p className="text-white/60">Loading auction...</p>
                    </div>
                ) : !auction ? (
                    <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-16 text-center">
                        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">
                            Auction Not Found
                        </h2>
                        <p className="text-white/60 mb-6">
                            The auction you're looking for doesn't exist or failed to load.
                        </p>
                        <button
                            onClick={() => router.push("/auctions")}
                            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all"
                        >
                            Browse Auctions
                        </button>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Hero Section */}
                        <div className="mb-10">
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
                                <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border tracking-widest flex items-center gap-1.5 ${auction.isActive
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${auction.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                    {auction.isActive ? 'Active' : 'Ended'}
                                </span>
                            </div>
                            <p className="text-slate-400 text-lg leading-relaxed max-w-4xl">
                                {auction.description || "No description provided for this auction."}
                            </p>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                            <StatCard label="Minimum Bid" value={`${formatEth(auction.minimumBid)} ETH`} icon={TrendingUp} colorClass="text-amber-400" />
                            <StatCard label="Bidders" value={auction.bidderCount} icon={Users} colorClass="text-blue-400" />
                            <StatCard label="Time Remaining" value={formatTimeRemaining(auction.timeRemaining)} icon={Clock} colorClass="text-emerald-400" />
                            <StatCard label="FHE Status" value={fheReady ? "Ready" : "Loading"} icon={ShieldCheck} colorClass="text-purple-400" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Main Interaction Area */}
                            <div className="lg:col-span-2 space-y-8">
                                <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:text-amber-500/10 transition-colors">
                                        <Lock size={120} />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                                                <Lock size={20} />
                                            </div>
                                            <h2 className="text-2xl font-bold text-white tracking-tight">Place Encrypted Bid</h2>
                                        </div>

                                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 mb-8 flex gap-4">
                                            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg h-fit">
                                                <Fingerprint size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-amber-500 text-sm font-bold tracking-tight mb-1">Zero-Knowledge Bidding</h4>
                                                <p className="text-slate-400 text-xs leading-relaxed">Your bid is encrypted using Fully Homomorphic Encryption. No one can see your bid amount until the reveal phase.</p>
                                            </div>
                                        </div>

                                        {/* NFT Warning / Deposit */}
                                        {auction.hasNFT && !auction.nftDeposited && (
                                            <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-6 mb-8 flex gap-4">
                                                <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg h-fit">
                                                    <AlertCircle size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-orange-500 text-sm font-bold tracking-tight mb-1">NFT Not Deposited</h4>
                                                    <p className="text-slate-400 text-xs leading-relaxed mb-3">
                                                        {auction.seller.toLowerCase() === address?.toLowerCase()
                                                            ? "You need to deposit the NFT to enable bidding."
                                                            : "The seller hasn't deposited the NFT yet. Bidding is disabled until the NFT is deposited."}
                                                    </p>
                                                    {auction.seller.toLowerCase() === address?.toLowerCase() && (
                                                        <button
                                                            onClick={handleDepositNFT}
                                                            disabled={depositingNFT}
                                                            className="w-full py-3 bg-orange-500 hover:bg-orange-400 disabled:bg-orange-500/50 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                                        >
                                                            {depositingNFT ? (
                                                                <>
                                                                    <LoadingSpinner size="sm" className="mr-2" />
                                                                    Depositing NFT...
                                                                </>
                                                            ) : (
                                                                "📦 Deposit NFT"
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handlePlaceBid(); }}>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                    Bid Amount (ETH)
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        placeholder={`Minimum: ${formatEth(auction.minimumBid)} ETH`}
                                                        value={bidAmount}
                                                        onChange={(e) => setBidAmount(e.target.value)}
                                                        disabled={bidding || !auction.isActive || (auction.hasNFT && !auction.nftDeposited)}
                                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white text-lg font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 font-bold uppercase tracking-widest text-xs">ETH</div>
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={
                                                    !fheReady ||
                                                    !isConnected ||
                                                    bidding ||
                                                    !auction.isActive ||
                                                    (auction.hasNFT && !auction.nftDeposited)
                                                }
                                                className="w-full py-5 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 disabled:cursor-not-allowed text-black font-black uppercase tracking-widest rounded-2xl transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)] flex items-center justify-center gap-3 group/btn active:scale-[0.98]"
                                            >
                                                {bidding ? (
                                                    <>
                                                        <LoadingSpinner size="sm" />
                                                        Encrypting & Submitting...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock size={20} className="group-hover/btn:rotate-12 transition-transform" />
                                                        Place Encrypted Bid
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Metadata */}
                            <div className="space-y-6">
                                {/* Seller */}
                                <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">
                                    <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Seller</h4>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center">
                                            <User size={18} className="text-slate-400" />
                                        </div>
                                        <p className="text-white font-mono text-xs break-all">{auction.seller}</p>
                                    </div>
                                </div>

                                {/* NFT Details */}
                                {auction.hasNFT && (
                                    <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">NFT Details</h4>
                                            {auction.nftDeposited && <CheckCircle size={16} className="text-emerald-500" />}
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-slate-600 text-[10px] font-bold uppercase mb-1">Contract</p>
                                                <p className="text-white font-mono text-[10px] break-all">{auction.nftContract}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-600 text-[10px] font-bold uppercase mb-1">Token ID</p>
                                                <p className="text-white font-mono text-[10px] break-all">{auction.nftTokenId?.toString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-600 text-[10px] font-bold uppercase mb-1">Status</p>
                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${auction.nftDeposited
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                    }`}>
                                                    {auction.nftDeposited ? 'Deposited' : 'Not Deposited'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Auction Details */}
                                <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">
                                    <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Details</h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <p className="text-slate-600 text-[10px] font-bold uppercase">Contract</p>
                                            <p className="text-white font-mono text-[10px]">{auctionAddress.slice(0, 6)}...{auctionAddress.slice(-4)}</p>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className="text-slate-600 text-[10px] font-bold uppercase">Start Time</p>
                                            <p className="text-white text-xs">{new Date(auction.startTime * 1000).toLocaleString()}</p>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className="text-slate-600 text-[10px] font-bold uppercase">End Time</p>
                                            <p className="text-white text-xs">{new Date(auction.endTime * 1000).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
