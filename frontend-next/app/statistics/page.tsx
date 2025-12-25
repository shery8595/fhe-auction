"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Gavel,
    History,
    Wallet,
    Settings,
    Plus,
    ArrowLeft,
    Shield,
    TrendingUp,
    TrendingDown,
    Users,
    Activity,
    Award,
    BarChart3,
    PieChart,
    Zap,
    Clock,
    CheckCircle2,
    Target
} from "lucide-react";
import { getStatistics, getAuctions } from "@/lib/subgraph";

const SidebarItem = ({ icon: Icon, label, active = false, href = "#" }: { icon: any, label: string, active?: boolean, href?: string }) => (
    <Link href={href} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-amber-500/10 text-amber-500 font-semibold shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
        <Icon size={20} />
        <span className="text-sm">{label}</span>
    </Link>
);

const AnimatedCounter = ({ value, duration = 2000 }: { value: number, duration?: number }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);

            setCount(Math.floor(progress * value));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return <>{count}</>;
};

const StatCard = ({
    label,
    value,
    icon: Icon,
    colorClass,
    trend,
    trendValue,
    animate = false
}: {
    label: string,
    value: string | number,
    icon: any,
    colorClass: string,
    trend?: "up" | "down",
    trendValue?: string,
    animate?: boolean
}) => (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] transition-all group relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-32 h-32 ${colorClass.replace('text-', 'bg-')}/5 blur-3xl -mr-16 -mt-16 pointer-events-none`}></div>
        <div className="relative">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${colorClass.replace('text-', 'bg-')}/10 border border-${colorClass.replace('text-', '')}/20`}>
                    <Icon className={colorClass} size={24} />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        <span className="text-xs font-bold">{trendValue}</span>
                    </div>
                )}
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{label}</p>
            <p className="text-4xl font-black text-white group-hover:scale-105 transition-transform origin-left tracking-tight">
                {animate && typeof value === 'number' ? <AnimatedCounter value={value} /> : value}
            </p>
        </div>
    </div>
);

// Mock data for charts
const activityData = [
    { day: 'Mon', auctions: 12, bids: 45 },
    { day: 'Tue', auctions: 19, bids: 67 },
    { day: 'Wed', auctions: 15, bids: 52 },
    { day: 'Thu', auctions: 25, bids: 89 },
    { day: 'Fri', auctions: 22, bids: 78 },
    { day: 'Sat', auctions: 18, bids: 61 },
    { day: 'Sun', auctions: 14, bids: 48 },
];

const LineChart = ({ data }: { data: typeof activityData }) => {
    const [animated, setAnimated] = useState(false);
    const maxValue = Math.max(...data.flatMap(d => [d.auctions, d.bids]));

    useEffect(() => {
        // Trigger animation after component mounts
        const timer = setTimeout(() => setAnimated(true), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
            <style jsx>{`
                @keyframes growBar {
                    from {
                        height: 0%;
                    }
                    to {
                        height: var(--target-height);
                    }
                }
                .bar-animate {
                    animation: growBar 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
            `}</style>
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Activity className="text-amber-500" size={20} />
                Weekly Activity Trend
            </h3>
            <div className="h-64 flex items-end justify-between gap-4">
                {data.map((item, index) => {
                    const auctionHeight = (item.auctions / maxValue) * 100;
                    const bidHeight = (item.bids / maxValue) * 100;

                    return (
                        <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
                            <div className="w-full flex gap-1 items-end h-48">
                                <div
                                    className={`flex-1 bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-lg hover:opacity-80 relative group ${animated ? 'bar-animate' : ''}`}
                                    style={{
                                        height: animated ? `${auctionHeight}%` : '0%',
                                        animationDelay: `${index * 100}ms`,
                                        '--target-height': `${auctionHeight}%`
                                    } as React.CSSProperties}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded text-xs text-white whitespace-nowrap">
                                        {item.auctions} auctions
                                    </div>
                                </div>
                                <div
                                    className={`flex-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg hover:opacity-80 relative group ${animated ? 'bar-animate' : ''}`}
                                    style={{
                                        height: animated ? `${bidHeight}%` : '0%',
                                        animationDelay: `${index * 100 + 50}ms`,
                                        '--target-height': `${bidHeight}%`
                                    } as React.CSSProperties}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded text-xs text-white whitespace-nowrap">
                                        {item.bids} bids
                                    </div>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-slate-500">{item.day}</span>
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-xs text-slate-400">Auctions</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-xs text-slate-400">Bids</span>
                </div>
            </div>
        </div>
    );
};

export default function StatisticsPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalAuctions: 0,
        activeAuctions: 0,
        endedAuctions: 0,
        totalBids: 0,
        totalUsers: 0,
        avgBidsPerAuction: 0,
        successRate: 0,
        firstPriceCount: 0,
        vickreyCount: 0,
        dutchCount: 0
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            if (!mounted) return;

            try {
                setLoading(true);

                const [globalStats, allAuctions] = await Promise.all([
                    getStatistics(),
                    getAuctions(1000, 0, 'createdAt', 'desc')
                ]);

                let firstPrice = 0, vickrey = 0, dutch = 0;
                let auctionsWithBids = 0;

                console.log('📊 Global Stats:', globalStats);
                console.log('📊 Fetched auctions:', allAuctions);
                console.log('📊 Total auctions from subgraph:', allAuctions.auctions?.length);

                if (allAuctions.auctions) {
                    allAuctions.auctions.forEach((auction: any) => {
                        console.log('🔍 Auction:', auction.title, 'Type:', auction.auctionType, 'Bid Count:', auction.bidCount);

                        // Subgraph returns enum strings: "FIRST_PRICE", "VICKREY", "DUTCH"
                        if (auction.auctionType === "FIRST_PRICE" || auction.auctionType === 0) firstPrice++;
                        else if (auction.auctionType === "VICKREY" || auction.auctionType === 1) vickrey++;
                        else if (auction.auctionType === "DUTCH" || auction.auctionType === 2) dutch++;

                        if (auction.bidCount > 0) auctionsWithBids++;
                    });
                }

                console.log('📈 Auction type counts - First-Price:', firstPrice, 'Vickrey:', vickrey, 'Dutch:', dutch);
                console.log('📊 Auctions with bids:', auctionsWithBids, '/', globalStats.totalAuctions);
                console.log('📊 Total bids from globalStats:', globalStats.totalBids);

                const avgBids = globalStats.totalAuctions > 0
                    ? (globalStats.totalBids / globalStats.totalAuctions).toFixed(1)
                    : 0;

                const successRate = globalStats.totalAuctions > 0
                    ? ((auctionsWithBids / globalStats.totalAuctions) * 100).toFixed(0)
                    : 0;

                console.log('📈 Calculated Metrics - Avg Bids:', avgBids, 'Success Rate:', successRate + '%');

                setStats({
                    totalAuctions: globalStats.totalAuctions,
                    activeAuctions: globalStats.activeAuctions,
                    endedAuctions: globalStats.endedAuctions,
                    totalBids: globalStats.totalBids,
                    totalUsers: globalStats.totalUsers || 0,
                    avgBidsPerAuction: Number(avgBids),
                    successRate: Number(successRate),
                    firstPriceCount: firstPrice,
                    vickreyCount: vickrey,
                    dutchCount: dutch
                });
            } catch (error) {
                console.error("Error fetching statistics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [mounted]);

    if (!mounted) {
        return <div className="min-h-screen bg-[#0a0a0a]" />;
    }

    return (
        <div className="flex min-h-screen bg-[#0a0a0a]">
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
                    <SidebarItem icon={BarChart3} label="Statistics" active href="/statistics" />
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

            <main className="flex-1 lg:ml-64 p-6 lg:p-12 w-full max-w-[1600px] mx-auto overflow-x-hidden">
                <header className="mb-12">
                    <Link href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm mb-4 lg:hidden">
                        <ArrowLeft size={16} />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-4xl lg:text-6xl font-serif text-white">
                        Platform <span className="text-amber-500 italic">Statistics</span>
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">Real-time analytics and insights from the FHE Auction Protocol.</p>
                </header>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-500 mx-auto mb-4"></div>
                        <p className="text-slate-400">Loading statistics...</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <Activity className="text-amber-500" size={28} />
                                Platform Overview
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatCard label="Total Auctions" value={stats.totalAuctions} icon={Gavel} colorClass="text-amber-400" trend="up" trendValue="+12%" animate />
                                <StatCard label="Active Auctions" value={stats.activeAuctions} icon={Zap} colorClass="text-emerald-400" animate />
                                <StatCard label="Total Bids" value={stats.totalBids} icon={Target} colorClass="text-blue-400" trend="up" trendValue="+8%" animate />
                                <StatCard label="Total Users" value={stats.totalUsers} icon={Users} colorClass="text-purple-400" animate />
                            </div>
                        </div>

                        <div className="mb-12">
                            <LineChart data={activityData} />
                        </div>

                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <Award className="text-amber-500" size={28} />
                                Engagement Metrics
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <StatCard label="Avg Bids per Auction" value={stats.avgBidsPerAuction} icon={BarChart3} colorClass="text-cyan-400" animate />
                                <StatCard label="Success Rate" value={`${stats.successRate}%`} icon={CheckCircle2} colorClass="text-emerald-400" />
                                <StatCard label="Ended Auctions" value={stats.endedAuctions} icon={Clock} colorClass="text-slate-400" animate />
                            </div>
                        </div>

                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <PieChart className="text-amber-500" size={28} />
                                Auction Type Distribution
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">First-Price</span>
                                        <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                                            <span className="text-purple-400 text-xs font-bold">
                                                {stats.totalAuctions > 0 ? ((stats.firstPriceCount / stats.totalAuctions) * 100).toFixed(0) : 0}%
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-3xl font-black text-white mb-4">
                                        {mounted && <AnimatedCounter value={stats.firstPriceCount} />}
                                    </p>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-1000"
                                            style={{ width: `${stats.totalAuctions > 0 ? (stats.firstPriceCount / stats.totalAuctions) * 100 : 0}%` }}></div>
                                    </div>
                                </div>

                                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Vickrey</span>
                                        <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                            <span className="text-blue-400 text-xs font-bold">
                                                {stats.totalAuctions > 0 ? ((stats.vickreyCount / stats.totalAuctions) * 100).toFixed(0) : 0}%
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-3xl font-black text-white mb-4">
                                        {mounted && <AnimatedCounter value={stats.vickreyCount} />}
                                    </p>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000"
                                            style={{ width: `${stats.totalAuctions > 0 ? (stats.vickreyCount / stats.totalAuctions) * 100 : 0}%` }}></div>
                                    </div>
                                </div>

                                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Dutch</span>
                                        <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                            <span className="text-amber-400 text-xs font-bold">
                                                {stats.totalAuctions > 0 ? ((stats.dutchCount / stats.totalAuctions) * 100).toFixed(0) : 0}%
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-3xl font-black text-white mb-4">
                                        {mounted && <AnimatedCounter value={stats.dutchCount} />}
                                    </p>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-1000"
                                            style={{ width: `${stats.totalAuctions > 0 ? (stats.dutchCount / stats.totalAuctions) * 100 : 0}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 flex items-start gap-4">
                            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                                <BarChart3 size={24} className="text-black" />
                            </div>
                            <div>
                                <h4 className="text-amber-400 font-bold uppercase text-xs tracking-widest mb-1">Real-Time Data</h4>
                                <p className="text-slate-300 text-sm">All statistics are fetched in real-time from The Graph subgraph, ensuring accuracy and up-to-date insights into platform activity.</p>
                            </div>
                        </div>
                    </>
                )}

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
