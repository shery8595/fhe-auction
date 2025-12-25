"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import {
    LayoutDashboard,
    Gavel,
    History,
    Wallet,
    Settings,
    Bell,
    Search,
    Plus,
    ArrowLeft,
    CheckCircle2,
    Clock,
    AlertCircle,
    FileText,
    ExternalLink,
    ChevronRight,
    LogOut,
    User,
    Shield,
    BarChart3
} from "lucide-react";
import { getUserRequests, getRequestDetails, BASE_AUCTION_ABI, approveNFTForAuction, checkNFTApproval } from "@/lib/contracts/factoryUtils";
import { FACTORY_ADDRESS, formatEth } from "@/lib/contracts/auctionUtils";
import { useWalletClient } from "wagmi";
import { getUserAuctions, getUserBids } from "@/lib/subgraph";

interface UserRequest {
    requestId: number;
    title: string;
    description: string;
    auctionType: number;
    status: number;
    deployedAuction: string;
    createdAt: number;
    minimumBid: bigint;
    hasNFT: boolean;
}

interface UserBid {
    auctionAddress: string;
    auctionTitle: string;
    auctionType: number;
    escrowAmount: bigint;
    isActive: boolean;
    ended: boolean;
}

interface WonAuction {
    auctionAddress: string;
    auctionTitle: string;
    auctionType: number;
    winningBid: bigint;
    claimed: boolean;
}

const REQUEST_STATUS = {
    PENDING: 0,
    APPROVED: 1,
    REJECTED: 2,
};

const SidebarItem = ({ icon: Icon, label, active = false, href = "#" }: { icon: any, label: string, active?: boolean, href?: string }) => (
    <Link href={href} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-amber-500/10 text-amber-500 font-semibold' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
        <Icon size={20} />
        <span className="text-sm">{label}</span>
    </Link>
);

const StatCard = ({ label, value, icon: Icon, colorClass }: { label: string, value: string | number, icon: any, colorClass: string }) => (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] transition-all group">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-2 rounded-lg ${colorClass.replace('text-', 'bg-')}/10`}>
                <Icon className={colorClass} size={20} />
            </div>
            <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">{label}</span>
        </div>
        <div className="text-3xl font-bold text-white group-hover:scale-105 transition-transform origin-left">{value}</div>
    </div>
);

export default function DashboardPage() {
    const { address, isConnected, isConnecting } = useAccount();
    const { data: walletClient } = useWalletClient();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<UserRequest[]>([]);
    const [bids, setBids] = useState<UserBid[]>([]);
    const [wonAuctions, setWonAuctions] = useState<WonAuction[]>([]);
    const [approvingNFT, setApprovingNFT] = useState<number | null>(null);
    const [nftApprovalStatus, setNftApprovalStatus] = useState<Record<number, boolean>>({});
    const [isReconnecting, setIsReconnecting] = useState(true);

    useEffect(() => {
        setMounted(true);
        // Give wagmi time to restore connection from storage
        const timer = setTimeout(() => {
            setIsReconnecting(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    // Fetch user's data
    useEffect(() => {
        const fetchUserData = async () => {
            if (!mounted || !isConnected || !address || !FACTORY_ADDRESS) return;

            try {
                setLoading(true);

                if (!window.ethereum) {
                    console.error("No ethereum provider");
                    return;
                }

                const provider = new ethers.BrowserProvider(window.ethereum);

                // Get user's request IDs
                const requestIds = await getUserRequests(provider, FACTORY_ADDRESS, address);

                if (requestIds.length > 0) {
                    const requestDetails = await Promise.all(
                        requestIds.map((id) => getRequestDetails(provider, FACTORY_ADDRESS, id))
                    );
                    setRequests(requestDetails);
                }


                // Fetch user's bids from subgraph (much faster than RPC!)
                const subgraphBids = await getUserBids(address);

                const userBids: UserBid[] = [];
                const userWonAuctions: WonAuction[] = [];

                if (subgraphBids.bids) {
                    // Process bids from subgraph
                    for (const bid of subgraphBids.bids) {
                        userBids.push({
                            auctionAddress: bid.auction.id,
                            auctionTitle: bid.auction.title,
                            auctionType: bid.auction.auctionType,
                            escrowAmount: BigInt(bid.escrowAmount),
                            isActive: !bid.auction.ended,
                            ended: bid.auction.ended,
                        });

                        // If auction ended, check if user won (need RPC call for winner info)
                        if (bid.auction.ended) {
                            try {
                                const auctionContract = new ethers.Contract(bid.auction.id, BASE_AUCTION_ABI, provider);
                                const winnerInfo = await auctionContract.getWinnerInfo();

                                if (winnerInfo.winnerAddress.toLowerCase() === address.toLowerCase() && winnerInfo.isRevealed) {
                                    const sellerClaimed = await auctionContract.sellerClaimed();
                                    userWonAuctions.push({
                                        auctionAddress: bid.auction.id,
                                        auctionTitle: bid.auction.title,
                                        auctionType: bid.auction.auctionType,
                                        winningBid: BigInt(winnerInfo.winningBidAmount),
                                        claimed: sellerClaimed,
                                    });
                                }
                            } catch (e) {
                                // Winner not revealed yet or error
                            }
                        }
                    }
                }

                setBids(userBids);
                setWonAuctions(userWonAuctions);
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [mounted, isConnected, address]);

    // Handle NFT approval
    const handleApproveNFT = async (requestId: number, nftContract: string, tokenId: string, auctionAddress: string) => {
        if (!walletClient) {
            alert("Please connect your wallet");
            return;
        }

        setApprovingNFT(requestId);
        try {
            // Convert wallet client to ethers signer
            const provider = new ethers.BrowserProvider(window.ethereum as any);
            const signer = await provider.getSigner();
            await approveNFTForAuction(signer, nftContract, tokenId, auctionAddress);

            // Update approval status
            setNftApprovalStatus(prev => ({ ...prev, [requestId]: true }));
            alert("✅ NFT approved successfully! You can now deposit it to the auction.");
        } catch (error: any) {
            console.error("Error approving NFT:", error);
            alert(`Failed to approve NFT: ${error.message || "Unknown error"}`);
        } finally {
            setApprovingNFT(null);
        }
    };

    const pendingRequests = requests.filter((r) => r.status === REQUEST_STATUS.PENDING);
    const approvedRequests = requests.filter((r) => r.status === REQUEST_STATUS.APPROVED);
    const rejectedRequests = requests.filter((r) => r.status === REQUEST_STATUS.REJECTED);

    // Show loading state during hydration to prevent flash of "not connected"
    if (!mounted) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#0a0a0a]">
            {/* Sidebar - Desktop Only */}
            <aside className="hidden lg:flex flex-col w-64 border-r border-white/10 p-6 gap-8 fixed h-full bg-[#0a0a0a] z-50">
                <div className="flex items-center gap-2 px-2">
                    <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        <Gavel size={22} className="text-black" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">FHE Auction</span>
                </div>

                <nav className="flex flex-col gap-1.5 flex-1">
                    <SidebarItem icon={LayoutDashboard} label="Dashboard" active href="/dashboard" />
                    <SidebarItem icon={Gavel} label="Browse Auctions" href="/auctions" />
                    <SidebarItem icon={History} label="My Bids" href="/bids" />
                    <SidebarItem icon={BarChart3} label="Statistics" href="/statistics" />
                    <SidebarItem icon={Wallet} label="Wallet" href="/wallet" />
                    <SidebarItem icon={Plus} label="Create Auction" href="/auction/create" />
                    <SidebarItem icon={Settings} label="Settings" href="/settings" />
                </nav>

                <div className="border-t border-white/10 pt-6 space-y-2">
                    <SidebarItem icon={Shield} label="Admin" href="/admin" />
                    <button onClick={() => router.push("/")} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/5 transition-colors group">
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">Back to Home</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 p-6 lg:p-10 max-w-7xl mx-auto w-full">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm mb-4 lg:hidden">
                            <ArrowLeft size={16} />
                            Back to Home
                        </Link>
                        <h1 className="text-4xl lg:text-5xl font-serif text-white flex items-center gap-4">
                            <span className="text-amber-500 italic">My</span> Dashboard
                        </h1>
                        <p className="text-slate-400 mt-2">Manage your high-stakes auction requests and track real-time status.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group hidden sm:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search auctions..."
                                className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 w-64 transition-all placeholder:text-slate-500"
                            />
                        </div>
                        <button className="p-2 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all relative">
                            <Bell size={20} />
                            {(pendingRequests.length > 0 || bids.length > 0) && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full border-2 border-black"></span>
                            )}
                        </button>
                    </div>
                </header>

                {!isConnected ? (
                    isConnecting || !mounted || isReconnecting ? (
                        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-16 text-center">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-500 mx-auto mb-4"></div>
                            <h2 className="text-2xl font-bold text-white mb-2">Connecting...</h2>
                            <p className="text-slate-400">Please wait while we restore your wallet connection.</p>
                        </div>
                    ) : (
                        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-16 text-center">
                            <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">Wallet Not Connected</h2>
                            <p className="text-slate-400 mb-6">Please connect your wallet to view your dashboard.</p>
                            <button onClick={() => router.push("/")} className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all">
                                Return to Home
                            </button>
                        </div>
                    )
                ) : (
                    <>
                        {/* Status Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                            <StatCard label="Total Requests" value={requests.length} icon={FileText} colorClass="text-blue-400" />
                            <StatCard label="Pending" value={pendingRequests.length} icon={Clock} colorClass="text-amber-400" />
                            <StatCard label="Approved" value={approvedRequests.length} icon={CheckCircle2} colorClass="text-emerald-400" />
                            <StatCard label="Rejected" value={rejectedRequests.length} icon={AlertCircle} colorClass="text-rose-400" />
                        </div>

                        {/* Wallet & Quick Action */}
                        <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl p-6 mb-12 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-500 rounded-xl">
                                    <Wallet size={24} className="text-black" />
                                </div>
                                <div>
                                    <p className="text-amber-500/60 text-xs font-bold uppercase tracking-widest">Connected Wallet</p>
                                    <p className="text-white font-mono text-sm break-all">{address}</p>
                                </div>
                            </div>
                            <button onClick={() => router.push("/auction/create")} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95">
                                <Plus size={20} />
                                Create New Auction
                            </button>
                        </div>

                        {/* Active Bids */}
                        {bids.length > 0 && (
                            <section className="mb-12">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">Your Active Bids</h2>
                                        <p className="text-slate-400 text-sm">Auctions where you currently have skin in the game.</p>
                                    </div>
                                    <button className="text-amber-500 hover:text-amber-400 text-sm font-semibold flex items-center gap-1">
                                        View All Bids <ChevronRight size={16} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {bids.map((bid) => (
                                        <div key={bid.auctionAddress} className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden group hover:border-amber-500/30 transition-all">
                                            <div className="p-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h3 className="text-xl font-bold text-white capitalize">{bid.auctionTitle}</h3>
                                                    <span className={`px-3 py-1 ${bid.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'} text-[10px] font-bold uppercase rounded-full tracking-wider border`}>
                                                        {bid.isActive ? 'ACTIVE' : bid.ended ? 'ENDED' : 'PENDING'}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2 mb-6">
                                                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase rounded border border-purple-500/20">
                                                        First-Price
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center bg-white/5 rounded-xl p-4 mb-6">
                                                    <span className="text-slate-400 text-sm">Your Escrow</span>
                                                    <span className="text-amber-500 font-bold text-lg">{formatEth(bid.escrowAmount)} ETH</span>
                                                </div>
                                                <button onClick={() => router.push(`/auction/${bid.auctionAddress}`)} className="w-full py-3 bg-white hover:bg-slate-200 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                                                    View Auction <ExternalLink size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Won Auctions */}
                        {wonAuctions.length > 0 && (
                            <section className="mb-12">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">🏆 Won Auctions</h2>
                                        <p className="text-slate-400 text-sm">Congratulations! You won these auctions.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {wonAuctions.map((won) => (
                                        <div key={won.auctionAddress} className="bg-white/[0.03] border border-emerald-500/30 rounded-2xl overflow-hidden group hover:border-emerald-500/50 transition-all">
                                            <div className="p-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h3 className="text-xl font-bold text-white capitalize">{won.auctionTitle}</h3>
                                                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase rounded-full tracking-wider border border-emerald-500/20">
                                                        WINNER 🎉
                                                    </span>
                                                </div>
                                                <div className="flex gap-2 mb-6">
                                                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase rounded border border-purple-500/20">
                                                        First-Price
                                                    </span>
                                                </div>
                                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6 space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-400 text-sm">Winning Bid</span>
                                                        <span className="text-emerald-400 font-bold text-lg">{formatEth(won.winningBid)} ETH</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-slate-400">Status</span>
                                                        <span className="text-white">{won.claimed ? "Claimed" : "Awaiting Claim"}</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => router.push(`/auction/${won.auctionAddress}`)} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                                                    View Auction <ExternalLink size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Auction Requests */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Your Auction Requests</h2>
                                    <p className="text-slate-400 text-sm">Track the status of your bespoke auction creation requests.</p>
                                </div>
                                <button className="text-amber-500 hover:text-amber-400 text-sm font-semibold flex items-center gap-1">
                                    History <ChevronRight size={16} />
                                </button>
                            </div>

                            {loading ? (
                                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-16 text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                                    <p className="text-slate-400">Loading your requests...</p>
                                </div>
                            ) : requests.length === 0 ? (
                                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-16 text-center">
                                    <FileText className="h-16 w-16 text-white/20 mx-auto mb-4" />
                                    <h3 className="text-2xl font-bold text-white mb-2">No Requests Yet</h3>
                                    <p className="text-slate-400 mb-6">You haven't created any auction requests yet.</p>
                                    <button onClick={() => router.push("/auction/create")} className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all inline-flex items-center gap-2">
                                        <Plus size={20} />
                                        Create Your First Auction
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {requests.map((req) => (
                                        <div key={req.requestId} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
                                            <div className="flex flex-col lg:flex-row justify-between gap-6">
                                                <div className="flex-1">
                                                    <div className="flex flex-wrap items-center gap-3 mb-4">
                                                        <div className={`p-2 rounded-lg ${req.status === REQUEST_STATUS.APPROVED ? 'bg-emerald-500/20 text-emerald-400' :
                                                            req.status === REQUEST_STATUS.PENDING ? 'bg-amber-500/20 text-amber-400' :
                                                                'bg-rose-500/20 text-rose-400'
                                                            }`}>
                                                            {req.status === REQUEST_STATUS.APPROVED ? <CheckCircle2 size={20} /> :
                                                                req.status === REQUEST_STATUS.PENDING ? <Clock size={20} /> :
                                                                    <AlertCircle size={20} />}
                                                        </div>
                                                        <h3 className="text-xl font-bold text-white">{req.title}</h3>
                                                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase rounded border border-amber-500/20">
                                                            Request #{req.requestId}
                                                        </span>
                                                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase rounded border border-purple-500/20">
                                                            First-Price
                                                        </span>
                                                        {req.hasNFT && (
                                                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase rounded border border-blue-500/20">
                                                                NFT
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-4 border-y border-white/5">
                                                        <div>
                                                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Minimum Bid</p>
                                                            <p className="text-amber-500 font-bold">{formatEth(req.minimumBid)} ETH</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Submitted</p>
                                                            <p className="text-white font-medium">{new Date(req.createdAt * 1000).toLocaleDateString()}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Status</p>
                                                            <span className={`font-medium ${req.status === REQUEST_STATUS.APPROVED ? 'text-emerald-400' :
                                                                req.status === REQUEST_STATUS.PENDING ? 'text-amber-400' :
                                                                    'text-rose-400'
                                                                }`}>
                                                                {req.status === REQUEST_STATUS.APPROVED ? 'Approved' :
                                                                    req.status === REQUEST_STATUS.PENDING ? 'Pending' :
                                                                        'Rejected'}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-end items-center">
                                                            <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors">
                                                                <Settings size={18} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {req.status === REQUEST_STATUS.APPROVED && req.deployedAuction && (
                                                        <>
                                                            {req.hasNFT ? (
                                                                <div className="mt-6 p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl space-y-4">
                                                                    <div className="flex items-center gap-3 text-purple-400">
                                                                        <CheckCircle2 size={18} />
                                                                        <span className="text-sm font-medium">Your NFT auction has been approved!</span>
                                                                    </div>
                                                                    <div className="flex flex-col sm:flex-row gap-3">
                                                                        <button
                                                                            onClick={async () => {
                                                                                const details = await getRequestDetails(
                                                                                    new ethers.BrowserProvider(window.ethereum as any),
                                                                                    FACTORY_ADDRESS,
                                                                                    req.requestId
                                                                                );
                                                                                handleApproveNFT(
                                                                                    req.requestId,
                                                                                    details.nftContract,
                                                                                    details.nftTokenId,
                                                                                    req.deployedAuction
                                                                                );
                                                                            }}
                                                                            disabled={approvingNFT === req.requestId || nftApprovalStatus[req.requestId]}
                                                                            className={`flex-1 px-6 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${nftApprovalStatus[req.requestId]
                                                                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                                                                : 'bg-purple-500 hover:bg-purple-400 disabled:bg-purple-500/50 disabled:cursor-not-allowed text-black shadow-lg shadow-purple-500/20'
                                                                                }`}
                                                                        >
                                                                            {approvingNFT === req.requestId ? (
                                                                                <>
                                                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                                                                                    Approving...
                                                                                </>
                                                                            ) : nftApprovalStatus[req.requestId] ? (
                                                                                <>
                                                                                    <CheckCircle2 size={16} />
                                                                                    NFT Approved
                                                                                </>
                                                                            ) : (
                                                                                "Approve NFT Transfer"
                                                                            )}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => router.push(`/auction/${req.deployedAuction}`)}
                                                                            className="flex-1 px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold rounded-lg transition-all shadow-lg shadow-emerald-500/20"
                                                                        >
                                                                            View Auction
                                                                        </button>
                                                                    </div>
                                                                    {nftApprovalStatus[req.requestId] ? (
                                                                        <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                                                            <CheckCircle2 size={18} className="text-emerald-500 mt-0.5" />
                                                                            <div>
                                                                                <p className="text-emerald-500 font-bold text-sm mb-1">NFT Approved Successfully!</p>
                                                                                <p className="text-xs text-slate-400">
                                                                                    Your NFT transfer has been approved. Click "View Auction" to deposit the NFT and start the auction.
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-xs text-slate-400">
                                                                            💡 Tip: After approving, visit the auction page to deposit your NFT and start the auction.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="mt-6 flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                                                                    <div className="flex items-center gap-3 text-emerald-400">
                                                                        <CheckCircle2 size={18} />
                                                                        <span className="text-sm font-medium">Your auction has been approved and deployed successfully!</span>
                                                                    </div>
                                                                    <button onClick={() => router.push(`/auction/${req.deployedAuction}`)} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold rounded-lg transition-all shadow-lg shadow-emerald-500/20">
                                                                        View Auction
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}

                                                    {req.status === REQUEST_STATUS.PENDING && (
                                                        <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                                                            <div className="flex items-center gap-3 text-amber-400">
                                                                <Clock size={18} />
                                                                <span className="text-sm font-medium">Your request is pending admin approval. You'll be notified once it's reviewed.</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {req.status === REQUEST_STATUS.REJECTED && (
                                                        <div className="mt-6 p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                                                            <div className="flex items-center gap-3 text-rose-400">
                                                                <AlertCircle size={18} />
                                                                <span className="text-sm font-medium">Your request was rejected by the admin. Please contact support for more information.</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}
