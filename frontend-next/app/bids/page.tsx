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
    Wallet as WalletIcon,
    Settings,
    Plus,
    ArrowLeft,
    Shield,
    Clock,
    Trophy,
    AlertCircle,
    Lock,
    Eye,
    LogOut,
    BarChart3
} from "lucide-react";
import { AUCTION_ABI } from "@/lib/contracts/auctionUtils";
import { FACTORY_ADDRESS, formatEth } from "@/lib/contracts/auctionUtils";
import { getUserBids } from "@/lib/subgraph";

interface UserBid {
    auctionAddress: string;
    auctionTitle: string;
    auctionType: number;
    escrowAmount: bigint;
    isActive: boolean;
    ended: boolean;
}

const SidebarItem = ({ icon: Icon, label, active = false, href = "#" }: { icon: any, label: string, active?: boolean, href?: string }) => (
    <Link href={href} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-amber-500/10 text-amber-500 font-semibold shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
        <Icon size={20} />
        <span className="text-sm">{label}</span>
    </Link>
);

const StatCard = ({ label, value, icon: Icon, colorClass }: { label: string, value: string | number, icon: any, colorClass: string }) => (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] transition-all group flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
            <div className={`p-2 rounded-lg ${colorClass.replace('text-', 'bg-')}/10`}>
                <Icon className={colorClass} size={18} />
            </div>
        </div>
        <div className="text-2xl font-bold text-white group-hover:scale-105 transition-transform origin-left tracking-tight">
            {value}
        </div>
    </div>
);

export default function MyBidsPage() {
    const { address, isConnected } = useAccount();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [bids, setBids] = useState<UserBid[]>([]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchBids = async () => {
            if (!mounted || !isConnected || !address) return;

            try {
                setLoading(true);

                // Fetch user's bids from subgraph (much faster than RPC!)
                const subgraphBids = await getUserBids(address);

                const userBids: UserBid[] = [];

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
                    }
                }

                setBids(userBids);
            } catch (error) {
                console.error("Error fetching bids:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBids();
    }, [mounted, isConnected, address]);

    const activeBids = bids.filter(b => b.isActive);
    const endedBids = bids.filter(b => b.ended);
    const totalEscrow = bids.reduce((sum, bid) => sum + bid.escrowAmount, BigInt(0));

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
                    <SidebarItem icon={History} label="My Bids" active href="/bids" />
                    <SidebarItem icon={BarChart3} label="Statistics" href="/statistics" />
                    <SidebarItem icon={WalletIcon} label="Wallet" href="/wallet" />
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
            <main className="flex-1 lg:ml-64 p-6 lg:p-12 w-full max-w-[1600px] mx-auto overflow-x-hidden">
                <header className="mb-12">
                    <Link href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm mb-4 lg:hidden">
                        <ArrowLeft size={16} />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-4xl lg:text-6xl font-serif text-white">
                        My <span className="text-amber-500 italic">Bids</span>
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">Track your active bids and participation history across the protocol.</p>
                </header>

                {!isConnected ? (
                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-16 text-center">
                        <Lock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Wallet Not Connected</h2>
                        <p className="text-slate-400 mb-6">Please connect your wallet to view your bids.</p>
                        <button onClick={() => router.push("/")} className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all">
                            Connect Wallet
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
                            <StatCard label="Active Bids" value={activeBids.length} icon={Gavel} colorClass="text-amber-400" />
                            <StatCard label="Total Escrow" value={`${formatEth(totalEscrow)} ETH`} icon={Shield} colorClass="text-emerald-400" />
                            <StatCard label="Ended" value={endedBids.length} icon={Clock} colorClass="text-blue-400" />
                            <StatCard label="Total Bids" value={bids.length} icon={Trophy} colorClass="text-purple-400" />
                        </div>

                        {/* Bids Table */}
                        {loading ? (
                            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-16 text-center">
                                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-500 mx-auto mb-4"></div>
                                <p className="text-slate-400">Loading your bids...</p>
                            </div>
                        ) : bids.length === 0 ? (
                            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-16 text-center">
                                <History className="h-16 w-16 text-white/20 mx-auto mb-4" />
                                <h3 className="text-2xl font-bold text-white mb-2">No Bids Yet</h3>
                                <p className="text-slate-400 mb-6">You haven't placed any bids yet. Browse auctions to get started!</p>
                                <button onClick={() => router.push("/auctions")} className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all">
                                    Browse Auctions
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="px-8 py-6 text-[10px] uppercase font-black text-slate-500 tracking-widest">Auction</th>
                                                <th className="px-8 py-6 text-[10px] uppercase font-black text-slate-500 tracking-widest">Type</th>
                                                <th className="px-8 py-6 text-[10px] uppercase font-black text-slate-500 tracking-widest">Your Escrow</th>
                                                <th className="px-8 py-6 text-[10px] uppercase font-black text-slate-500 tracking-widest">Status</th>
                                                <th className="px-8 py-6 text-[10px] uppercase font-black text-slate-500 tracking-widest text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {bids.map((bid) => (
                                                <tr key={bid.auctionAddress} className="group hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-amber-500 border border-white/10 group-hover:border-amber-500/50 transition-all">
                                                                <Lock size={18} />
                                                            </div>
                                                            <span className="text-white font-bold tracking-tight">{bid.auctionTitle}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded text-[10px] font-bold text-purple-400 uppercase">
                                                            First-Price
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-white font-mono font-bold">{formatEth(bid.escrowAmount)} ETH</td>
                                                    <td className="px-8 py-6">
                                                        {bid.isActive ? (
                                                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                Active
                                                            </div>
                                                        ) : bid.ended ? (
                                                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                                                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                                                                Ended
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                                                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                                Pending
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <button
                                                            onClick={() => router.push(`/auction/${bid.auctionAddress}`)}
                                                            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
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
