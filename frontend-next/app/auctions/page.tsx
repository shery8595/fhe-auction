"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import Link from "next/link";
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
    ShieldCheck,
    Lock,
    Users,
    Filter,
    ArrowUpRight,
    Clock,
    LogOut,
    Shield,
    BarChart3
} from "lucide-react";
import { FACTORY_ADDRESS } from "@/lib/contracts/auctionUtils";
import { BASE_AUCTION_ABI } from "@/lib/contracts/factoryUtils";
import { getActiveAuctions, getAuctions } from "@/lib/subgraph";

interface AuctionListing {
    address: string;
    title: string;
    description: string;
    type: number;
    minBid: bigint;
    bidders: number;
    timeLeft: string;
    isLive: boolean;
    seller: string;
    nftImage?: string; // Optional NFT image URL
}

const AUCTION_TYPE_NAMES: { [key: number]: string } = {
    0: "FIRST-PRICE",
    1: "VICKREY",
    2: "DUTCH",
};

const SidebarItem = ({ icon: Icon, label, active = false, href = "#" }: { icon: any, label: string, active?: boolean, href?: string }) => (
    <Link href={href} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-amber-500/10 text-amber-500 font-semibold shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
        <Icon size={20} />
        <span className="text-sm">{label}</span>
    </Link>
);

export default function AuctionsPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeAuctions, setActiveAuctions] = useState<AuctionListing[]>([]);
    const [endedAuctions, setEndedAuctions] = useState<AuctionListing[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"live" | "past">("live");

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchAuctions = async () => {
            if (!mounted) return;

            try {
                setLoading(true);

                // Fetch both active and ended auctions from subgraph
                const [activeData, endedData] = await Promise.all([
                    getActiveAuctions(100),
                    getAuctions(100, 0, 'endedAt', 'desc') // Get ended auctions sorted by most recent
                ]);

                const processAuctions = async (auctions: any[]) => {
                    // Import NFT utilities and ethers
                    const { getNFTMetadata } = await import('@/lib/nftUtils');
                    const { ethers } = await import('ethers');
                    const { AUCTION_ABI } = await import('@/lib/contracts/auctionUtils');

                    const auctionPromises = auctions.map(async (auction: any) => {
                        // Calculate time remaining
                        const endTime = Number(auction.endTime);
                        const now = Math.floor(Date.now() / 1000);
                        const timeRemaining = Math.max(0, endTime - now);

                        const formatTimeRemaining = (seconds: number) => {
                            if (seconds <= 0) return "0m";
                            const hours = Math.floor(seconds / 3600);
                            const minutes = Math.floor((seconds % 3600) / 60);
                            return `${hours}h ${minutes}m`;
                        };

                        // Check if NFT is deposited for NFT auctions
                        let nftDeposited = true; // Default to true for non-NFT auctions
                        if (auction.hasNFT) {
                            try {
                                if (window.ethereum) {
                                    const provider = new ethers.BrowserProvider(window.ethereum);
                                    const contract = new ethers.Contract(auction.id, AUCTION_ABI, provider);
                                    nftDeposited = await contract.nftDeposited();
                                }
                            } catch (error) {
                                console.error('Error checking NFT deposit status:', auction.id, error);
                            }
                        }

                        // Fetch NFT metadata if this is an NFT auction
                        let nftImage = undefined;
                        if (auction.hasNFT && auction.nftContract && auction.nftTokenId) {
                            try {
                                const metadata = await getNFTMetadata(auction.nftContract, auction.nftTokenId);
                                if (metadata?.image) {
                                    nftImage = metadata.image;
                                }
                            } catch (error) {
                                console.error('Error fetching NFT metadata for auction:', auction.id, error);
                            }
                        }

                        // Determine if auction is truly live
                        // For NFT auctions, it's only live if NFT is deposited AND time hasn't ended
                        const isTrulyLive = !auction.ended && timeRemaining > 0 && nftDeposited;

                        // Adjust time display for NFT auctions without deposited NFT
                        let displayTimeLeft = formatTimeRemaining(timeRemaining);
                        if (auction.hasNFT && !nftDeposited) {
                            displayTimeLeft = "Waiting for NFT";
                        }

                        return {
                            address: auction.id,
                            title: auction.title,
                            description: auction.description,
                            type: auction.auctionType,
                            minBid: BigInt(auction.minimumBid),
                            bidders: auction.bidderCount || 0,
                            timeLeft: displayTimeLeft,
                            isLive: isTrulyLive,
                            seller: auction.sellerAddress || auction.seller,
                            nftImage, // Add NFT image URL
                        };
                    });

                    return Promise.all(auctionPromises);
                };

                if (activeData.auctions) {
                    const processed = await processAuctions(activeData.auctions);
                    setActiveAuctions(processed);
                }

                if (endedData.auctions) {
                    const ended = endedData.auctions.filter((a: any) => a.ended);
                    const processed = await processAuctions(ended);
                    setEndedAuctions(processed);
                }
            } catch (error) {
                console.error("Error fetching auctions:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAuctions();
    }, [mounted]);

    const currentAuctions = activeTab === "live" ? activeAuctions : endedAuctions;
    const filteredAuctions = currentAuctions.filter((auction) =>
        auction.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        AUCTION_TYPE_NAMES[auction.type].toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!mounted) {
        return <div className="min-h-screen bg-[#0a0a0a]" />;
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
                    <SidebarItem icon={LayoutDashboard} label="Dashboard" href="/dashboard" />
                    <SidebarItem icon={Gavel} label="Browse Auctions" active href="/auctions" />
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

            {/* Main Content Area */}
            <main className="flex-1 lg:ml-64 p-6 lg:p-12 w-full max-w-[1600px] mx-auto overflow-x-hidden">
                <header className="mb-12">
                    <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm mb-4 lg:hidden">
                        <ArrowLeft size={16} />
                        Back to Home
                    </Link>
                    <h1 className="text-4xl lg:text-6xl font-serif text-white flex items-center gap-4">
                        Browse <span className="text-amber-500 italic">Auctions</span>
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">Discover and participate in privacy-preserving auctions powered by FHE.</p>
                </header>

                {/* FHE Status Banner */}
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 mb-10 flex items-center gap-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] shrink-0">
                        <ShieldCheck size={28} className="text-black" />
                    </div>
                    <div>
                        <h4 className="text-emerald-400 font-bold uppercase text-xs tracking-widest mb-1">FHE Engine Ready</h4>
                        <p className="text-slate-300 text-sm">Your bids will be securely encrypted locally. Only the final result will be revealed.</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 mb-8 bg-white/[0.03] p-2 rounded-2xl border border-white/10 w-fit">
                    <button
                        onClick={() => setActiveTab("live")}
                        className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === "live"
                            ? "bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                            : "text-slate-400 hover:text-white"
                            }`}
                    >
                        🔴 Live Auctions ({activeAuctions.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("past")}
                        className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === "past"
                            ? "bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                            : "text-slate-400 hover:text-white"
                            }`}
                    >
                        📜 Past Auctions ({endedAuctions.length})
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-white/[0.03] p-4 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name or type..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 w-full transition-all placeholder:text-slate-500"
                            />
                        </div>
                        <button className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
                            <Filter size={20} />
                        </button>
                    </div>
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-500 mx-auto mb-4"></div>
                        <p className="text-slate-400">Loading auctions...</p>
                    </div>
                ) : filteredAuctions.length === 0 ? (
                    <div className="text-center py-20 bg-white/[0.03] border border-white/10 rounded-3xl">
                        <Gavel className="h-16 w-16 text-white/20 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-white mb-2">No Auctions Found</h3>
                        <p className="text-slate-400 mb-6">
                            {searchQuery ? "Try adjusting your search query." : "No auctions are currently available."}
                        </p>
                        <button onClick={() => router.push("/auction/create")} className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all inline-flex items-center gap-2">
                            <Plus size={20} />
                            Create First Auction
                        </button>
                    </div>
                ) : (
                    /* Auction Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredAuctions.map((item) => (
                            <div key={item.address} className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden group hover:border-amber-500/30 hover:bg-white/[0.05] transition-all duration-300">
                                {/* Thumbnail */}
                                <div className="aspect-[16/10] bg-gradient-to-br from-slate-900 to-black relative flex items-center justify-center overflow-hidden">
                                    {item.nftImage ? (
                                        <>
                                            <img
                                                src={item.nftImage}
                                                alt={item.title}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    // Fallback to lock icon if image fails to load
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'none';
                                                    const parent = target.parentElement;
                                                    if (parent) {
                                                        parent.innerHTML = `
                                                            <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.05),transparent_50%)]"></div>
                                                            <div class="relative group-hover:scale-110 transition-transform duration-500 ease-out">
                                                                <div class="p-6 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                                                </div>
                                                            </div>
                                                        `;
                                                    }
                                                }}
                                            />
                                            {/* Gradient overlay for better badge visibility */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40"></div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.05),transparent_50%)]"></div>
                                            <div className="relative group-hover:scale-110 transition-transform duration-500 ease-out p-8">
                                                <div className="p-6 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                                                    <Lock size={48} className="text-amber-500" />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    {item.isLive && (
                                        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-emerald-500/30">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                                            <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Live</span>
                                        </div>
                                    )}
                                    {item.nftImage && (
                                        <div className="absolute top-4 left-4 ml-20 px-2.5 py-1 bg-blue-500/90 text-white text-[10px] font-black uppercase rounded-full tracking-widest border border-blue-400/50 backdrop-blur-sm">
                                            NFT
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4 px-3 py-1 bg-amber-500 text-black text-[10px] font-black uppercase rounded-full tracking-widest">
                                        {AUCTION_TYPE_NAMES[item.type]}
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h3 className="text-2xl font-bold text-white mb-2 tracking-tight group-hover:text-amber-500 transition-colors line-clamp-1">{item.title}</h3>
                                    <p className="text-slate-400 text-sm mb-6 line-clamp-2">{item.description}</p>

                                    <div className="space-y-4 mb-8">
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2 text-slate-500 font-medium">
                                                <Users size={16} />
                                                <span>Bidders</span>
                                            </div>
                                            <span className="text-white font-bold">{item.bidders} Participated</span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                                <Clock size={16} />
                                                <span>Remaining</span>
                                            </div>
                                            <span className={`font-bold tracking-tight ${item.timeLeft === 'Ended' ? 'text-rose-500' : 'text-amber-500'}`}>
                                                {item.timeLeft}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Min. Bid</p>
                                            <p className="text-xl font-black text-white tracking-tighter">{ethers.formatEther(item.minBid)} ETH</p>
                                        </div>
                                        <button
                                            onClick={() => router.push(`/auction/${item.address}`)}
                                            className="flex-1 py-4 bg-white/5 hover:bg-white text-white hover:text-black border border-white/10 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 group/btn"
                                        >
                                            View Details
                                            <ArrowUpRight size={18} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

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
