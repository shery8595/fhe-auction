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
    Plus,
    ArrowLeft,
    Shield,
    Clock,
    CheckCircle2,
    Trophy,
    User,
    Cpu,
    XCircle,
    AlertCircle,
    LogOut,
    BarChart3
} from "lucide-react";
import {
    getPendingRequests,
    getRequestDetails,
    rejectRequest,
    registerAuction,
} from "@/lib/contracts/factoryUtils";
import { FACTORY_ADDRESS, formatEth } from "@/lib/contracts/auctionUtils";
import { deployAuctionContract } from "@/lib/contracts/deployAuction";
import {
    checkLinkBalance,
    formatLinkBalance,
    MIN_LINK_BALANCE
} from "@/lib/contracts/chainlinkUtils";

interface RequestDetails {
    requestId: number;
    seller: string;
    title: string;
    description: string;
    auctionType: number;
    durationMinutes: number;
    minimumBid: bigint;
    status: number;
    deployedAuction: string;
    createdAt: number;
    hasNFT: boolean;
    nftContract?: string;
    nftTokenId?: bigint;
    startingPrice?: bigint;
    reservePrice?: bigint;
    priceDecrement?: bigint;
    decrementInterval?: number;
}

const SidebarItem = ({ icon: Icon, label, active = false, href = "#" }: { icon: any, label: string, active?: boolean, href?: string }) => (
    <Link href={href} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-amber-500/10 text-amber-500 font-semibold shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
        <Icon size={20} />
        <span className="text-sm">{label}</span>
    </Link>
);

const StatCard = ({ label, value, icon: Icon, colorClass, subtitle }: { label: string, value: string | number, icon: any, colorClass: string, subtitle?: string }) => (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] transition-all group flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
            <div className={`p-2 rounded-lg ${colorClass.replace('text-', 'bg-')}/10`}>
                <Icon className={colorClass} size={18} />
            </div>
        </div>
        <div className="space-y-1">
            <div className="text-2xl font-bold text-white group-hover:scale-105 transition-transform origin-left tracking-tight truncate">
                {value}
            </div>
            {subtitle && <p className="text-[10px] font-mono text-slate-500 truncate">{subtitle}</p>}
        </div>
    </div>
);

export default function AdminPage() {
    const { address, isConnected } = useAccount();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<RequestDetails[]>([]);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [linkBalance, setLinkBalance] = useState<bigint>(BigInt(0));
    const [loadingLink, setLoadingLink] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchRequests = async () => {
            if (!mounted || !FACTORY_ADDRESS) return;

            try {
                setLoading(true);

                if (!window.ethereum) {
                    console.error("No ethereum provider");
                    return;
                }

                const provider = new ethers.BrowserProvider(window.ethereum);
                const requestIds = await getPendingRequests(provider, FACTORY_ADDRESS);

                if (requestIds.length === 0) {
                    setRequests([]);
                    return;
                }

                const requestDetails = await Promise.all(
                    requestIds.map((id) => getRequestDetails(provider, FACTORY_ADDRESS, id))
                );

                setRequests(requestDetails);
            } catch (error) {
                console.error("Error fetching requests:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, [mounted]);

    // Fetch LINK balance
    useEffect(() => {
        const fetchLinkBalance = async () => {
            if (!mounted || !window.ethereum || !address) return;

            try {
                setLoadingLink(true);
                const provider = new ethers.BrowserProvider(window.ethereum);
                const balance = await checkLinkBalance(provider, address);
                setLinkBalance(balance);
            } catch (error) {
                console.error("Error fetching LINK balance:", error);
            } finally {
                setLoadingLink(false);
            }
        };

        fetchLinkBalance();
    }, [mounted, address]);

    const handleReject = async (requestId: number) => {
        if (!window.ethereum || !isConnected) {
            alert("Please connect your wallet");
            return;
        }

        if (!confirm(`Are you sure you want to reject request #${requestId}?`)) {
            return;
        }

        setProcessingId(requestId);

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            await rejectRequest(signer, FACTORY_ADDRESS, requestId);

            alert(`✅ Request #${requestId} rejected successfully!`);

            setRequests(requests.filter((r) => r.requestId !== requestId));
        } catch (error: any) {
            console.error("Error rejecting request:", error);
            alert("Failed to reject request: " + (error.shortMessage || error.message));
        } finally {
            setProcessingId(null);
        }
    };

    const handleApprove = async (request: RequestDetails) => {
        if (!window.ethereum || !isConnected) {
            alert("Please connect your wallet");
            return;
        }

        // Check LINK balance
        if (linkBalance < MIN_LINK_BALANCE) {
            const proceed = confirm(
                `⚠️ Low LINK Balance\n\nYour LINK balance: ${formatLinkBalance(linkBalance)} LINK\nRequired: ${formatLinkBalance(MIN_LINK_BALANCE)} LINK\n\nYou need testnet LINK to register auctions with Chainlink Automation.\n\nGet free testnet LINK from: https://faucets.chain.link/sepolia\n\nDo you want to proceed anyway? (Auction will deploy but won't auto-end)`
            );
            if (!proceed) return;
        }

        if (!confirm(`Deploy and approve auction: "${request.title}"?`)) {
            return;
        }

        setProcessingId(request.requestId);

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // Step 1: Deploy auction contract
            console.log("📦 Deploying auction contract...");
            const auctionAddress = await deployAuctionContract(
                signer,
                request.title,
                request.description,
                request.durationMinutes,
                request.minimumBid,
                request.seller,
                request.nftContract || ethers.ZeroAddress,
                request.nftTokenId || BigInt(0)
            );

            // Step 2: Register with factory
            console.log("📝 Registering with factory...");
            await registerAuction(signer, FACTORY_ADDRESS, request.requestId, auctionAddress);

            // Success message
            const isNFTAuction = request.hasNFT;
            let message = `✅ Auction deployed and registered!\n\nAddress: ${auctionAddress}`;

            if (isNFTAuction) {
                message += `\n\n⚠️ IMPORTANT: Seller must deposit NFT before bidding can start.`;
            }

            alert(message);

            setRequests(requests.filter((r) => r.requestId !== request.requestId));

            // Refresh LINK balance
            if (address) {
                const newBalance = await checkLinkBalance(provider, address);
                setLinkBalance(newBalance);
            }
        } catch (error: any) {
            console.error("Error approving request:", error);
            alert("Failed to approve request: " + (error.shortMessage || error.message));
        } finally {
            setProcessingId(null);
        }
    };

    if (!mounted) {
        return <div className="min-h-screen bg-[#0a0a0a]" />;
    }

    return (
        <div className="flex min-h-screen bg-[#0a0a0a]">
            {/* Sidebar */}
            <aside className="hidden lg:flex flex-col w-64 border-r border-white/10 p-6 gap-8 fixed h-full bg-[#0a0a0a] z-50">
                <div className="flex items-center gap-2 px-2">
                    <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        <Gavel size={22} className="text-black" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">FHE Auction</span>
                </div>

                <nav className="flex flex-col gap-1.5 flex-1">
                    <SidebarItem icon={LayoutDashboard} label="Dashboard" href="/dashboard" />
                    <SidebarItem icon={Gavel} label="Browse Auctions" href="/auctions" />
                    <SidebarItem icon={History} label="My Bids" href="/bids" />
                    <SidebarItem icon={BarChart3} label="Statistics" href="/statistics" />
                    <SidebarItem icon={Wallet} label="Wallet" href="/wallet" />
                    <SidebarItem icon={Plus} label="Create Auction" href="/auction/create" />
                    <SidebarItem icon={Settings} label="Settings" href="/settings" />
                </nav>

                <div className="border-t border-white/10 pt-6 space-y-2">
                    <SidebarItem icon={Shield} label="Admin View" active href="/admin" />
                    <button onClick={() => router.push("/")} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/5 transition-colors group">
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">Back to Home</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 p-6 lg:p-12 w-full max-w-[1600px] mx-auto overflow-x-hidden">
                <header className="mb-12">
                    <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm mb-4 lg:hidden">
                        <ArrowLeft size={16} />
                        Back to Home
                    </Link>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                            <Shield size={32} />
                        </div>
                        <h1 className="text-4xl lg:text-6xl font-serif text-white">
                            Admin <span className="text-amber-500 italic">Dashboard</span>
                        </h1>
                    </div>
                    <p className="text-slate-400 mt-4 text-lg max-w-2xl">
                        Review, approve, and manage pending auction creation requests across the protocol.
                    </p>
                </header>

                {/* Admin Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    <StatCard
                        label="Pending Requests"
                        value={requests.length}
                        icon={Clock}
                        colorClass="text-amber-400"
                    />
                    <StatCard
                        label="Factory Address"
                        value={FACTORY_ADDRESS ? `${FACTORY_ADDRESS.slice(0, 6)}...${FACTORY_ADDRESS.slice(-4)}` : "N/A"}
                        subtitle={FACTORY_ADDRESS}
                        icon={Cpu}
                        colorClass="text-emerald-400"
                    />
                    <StatCard
                        label="LINK Balance (Admin)"
                        value={loadingLink ? "Loading..." : `${formatLinkBalance(linkBalance)} LINK`}
                        subtitle={linkBalance >= MIN_LINK_BALANCE ? "✅ Sufficient for factory automation" : "⚠️ Low balance - get testnet LINK"}
                        icon={Wallet}
                        colorClass={linkBalance >= MIN_LINK_BALANCE ? "text-green-400" : "text-orange-400"}
                    />
                </div>

                {/* Main Admin Section */}
                <section>
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                        <div>
                            <h2 className="text-3xl font-bold text-white tracking-tight">Pending Auction Requests</h2>
                            <p className="text-slate-500 text-sm mt-1">Review and approve or reject auction creation requests from users.</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-16 text-center">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-500 mx-auto mb-4"></div>
                            <p className="text-slate-400">Loading pending requests...</p>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="bg-white/[0.01] border border-white/5 rounded-[3rem] p-20 flex flex-col items-center text-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.01] to-transparent pointer-events-none"></div>

                            <div className="relative mb-8">
                                <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)] group-hover:scale-110 transition-transform duration-500">
                                    <CheckCircle2 size={48} className="text-emerald-500" />
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-black border border-white/10 rounded-full flex items-center justify-center">
                                    <Trophy size={20} className="text-amber-500" />
                                </div>
                            </div>

                            <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">All Caught Up!</h3>
                            <p className="text-slate-400 max-w-sm text-lg leading-relaxed">
                                There are currently no pending auction requests requiring your attention. You're doing a great job!
                            </p>

                            <div className="mt-12 flex gap-4">
                                <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all border border-white/10 text-sm">
                                    Refresh Queue
                                </button>
                                <button onClick={() => router.push("/auctions")} className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all shadow-[0_0_30px_rgba(245,158,11,0.2)] text-sm">
                                    View Auctions
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {requests.map((request) => (
                                <div key={request.requestId} className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all">
                                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-500">
                                                    <Clock size={20} />
                                                </div>
                                                <h3 className="text-2xl font-bold text-white">{request.title}</h3>
                                                <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase rounded-full border border-amber-500/20">
                                                    Request #{request.requestId}
                                                </span>
                                                <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase rounded-full border border-purple-500/20">
                                                    First-Price
                                                </span>
                                                {request.hasNFT && (
                                                    <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase rounded-full border border-blue-500/20">
                                                        NFT
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-slate-400 mb-6">{request.description}</p>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-4 border-y border-white/5">
                                                <div>
                                                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Minimum Bid</p>
                                                    <p className="text-amber-500 font-bold">{formatEth(request.minimumBid)} ETH</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Duration</p>
                                                    <p className="text-white font-medium">{Math.floor(request.durationMinutes / 60)}h</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Seller</p>
                                                    <p className="text-white font-mono text-xs">{request.seller.slice(0, 6)}...{request.seller.slice(-4)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Submitted</p>
                                                    <p className="text-white font-medium">{new Date(request.createdAt * 1000).toLocaleDateString()}</p>
                                                </div>
                                            </div>

                                            <div className="mt-6 flex flex-col sm:flex-row gap-4">
                                                <button
                                                    onClick={() => handleReject(request.requestId)}
                                                    disabled={processingId === request.requestId}
                                                    className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    <XCircle size={18} />
                                                    {processingId === request.requestId ? "Processing..." : "Reject"}
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(request)}
                                                    disabled={processingId === request.requestId}
                                                    className="flex-[2] py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle2 size={18} />
                                                    {processingId === request.requestId ? "Deploying..." : "Approve & Deploy"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Footer */}
                <footer className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-xs font-medium uppercase tracking-widest pb-10">
                    <p>© 2025 FHE Auction Protocol. All rights reserved.</p>
                    <div className="flex gap-8">
                        <a href="/docs" className="hover:text-amber-500 transition-colors">Documentation</a>
                        <a href="#" className="hover:text-amber-500 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-amber-500 transition-colors">Status</a>
                    </div>
                </footer>
            </main>
        </div>
    );
}
