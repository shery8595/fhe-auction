"use client";

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from "wagmi";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { ShinyButton } from "@/components/ui/shiny-button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading";
import { MatrixRain, ProgressiveBlur } from "@/components/ui/background-effects";
import { RevealOnScroll } from "@/components/ui/reveal-on-scroll";
import { AnimatedHeadline } from "@/components/ui/animated-headline";
import { AuctionCarousel } from "@/components/ui/auction-carousel";
import { Clock, TrendingUp, Lock, Shield, Zap, ChevronRight, Activity, Users, Gavel } from "lucide-react";
import { getActiveAuctions, getStatistics } from "@/lib/subgraph";

interface AuctionData {
    address: string;
    title: string;
    type: string;
    bids: number;
    timeLeft: string;
    minBid: string;
    isActive: boolean;
    nftImage?: string; // Optional NFT image URL
}

export default function HomePage() {
    const { address, isConnected } = useAccount();
    const [mounted, setMounted] = useState(false);
    const [auctions, setAuctions] = useState<AuctionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalAuctions: 0,
        activeAuctions: 0,
        totalBids: 0
    });

    useEffect(() => {
        setMounted(true);
        fetchData();
    }, []);

    async function fetchData() {
        try {
            setLoading(true);

            // Fetch from subgraph instead of RPC
            const [activeData, statsData] = await Promise.all([
                getActiveAuctions(100),
                getStatistics()
            ]);

            console.log('📊 Homepage - Active auctions:', activeData);
            console.log('📊 Homepage - Stats:', statsData);

            if (activeData.auctions) {
                // Fetch NFT metadata for auctions with NFTs
                const { getNFTMetadata } = await import('@/lib/nftUtils');
                const { AUCTION_ABI } = await import('@/lib/contracts/auctionUtils');

                const auctionDataPromises = activeData.auctions.map(async (auction: any) => {
                    // Calculate time remaining
                    const endTime = Number(auction.endTime);
                    const now = Math.floor(Date.now() / 1000);
                    const timeRemaining = Math.max(0, endTime - now);

                    const formatTimeRemaining = (seconds: number) => {
                        if (seconds <= 0) return "Ended";
                        const days = Math.floor(seconds / 86400);
                        const hours = Math.floor((seconds % 86400) / 3600);
                        const minutes = Math.floor((seconds % 3600) / 60);

                        if (days > 0) return `${days}d ${hours}h`;
                        if (hours > 0) return `${hours}h ${minutes}m`;
                        return `${minutes}m`;
                    };

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

                    return {
                        address: auction.id,
                        title: auction.title || "Untitled Auction",
                        type: "First-Price",
                        bids: auction.bidCount || 0,
                        timeLeft: formatTimeRemaining(timeRemaining),
                        minBid: `${Number(ethers.formatEther(auction.minimumBid))} ETH`,
                        isActive: !auction.ended && timeRemaining > 0,
                        nftImage, // Add NFT image URL
                    };
                });

                const auctionData = await Promise.all(auctionDataPromises);
                setAuctions(auctionData);
            }

            setStats({
                totalAuctions: statsData.totalAuctions,
                activeAuctions: statsData.activeAuctions,
                totalBids: statsData.totalBids
            });

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }

    const liveAuctions = useMemo(() => {
        return auctions.filter(a => a.isActive);
    }, [auctions]);

    return (
        <div className="min-h-screen relative selection:bg-[#FF4D00] selection:text-white">
            {/* Background Matrix Rain */}
            <MatrixRain />

            {/* Visual Effects */}
            <ProgressiveBlur />

            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 flex items-center justify-between px-6 py-6 lg:px-12 backdrop-blur-sm">
                <Link href="/" className="text-2xl font-display font-bold tracking-tight text-white">
                    FHE AUCTIONS
                </Link>
                <div className="hidden md:flex space-x-8 text-sm font-medium text-white/80">
                    <Link href="/auctions" className="hover:text-yellow-400 transition-colors">Browse</Link>
                    <Link href="/auction/create" className="hover:text-yellow-400 transition-colors">Create</Link>
                    <Link href="/dashboard" className="hover:text-yellow-400 transition-colors">Dashboard</Link>
                    <Link href="/admin" className="hover:text-yellow-400 transition-colors">Admin</Link>
                </div>

                {mounted && <ConnectButton />}
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex flex-col justify-center items-center px-4 pt-20 text-center">
                <RevealOnScroll className="max-w-5xl mx-auto space-y-8">
                    <div className="inline-flex items-center space-x-2 bg-yellow-500/5 border border-yellow-500/10 rounded-full px-4 py-1.5 backdrop-blur-md mb-4">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs uppercase tracking-wider font-semibold text-white/80">Powered by FHE</span>
                    </div>

                    <AnimatedHeadline />

                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-white/70 font-light leading-relaxed">
                        Participate in sealed-bid auctions where your bids are encrypted locally using Fully Homomorphic Encryption and never exposed in plaintext.
                    </p>

                    <div className="pt-8 flex flex-col md:flex-row items-center justify-center gap-6">
                        <Link href="/auctions">
                            <ShinyButton className="w-full sm:w-auto">
                                Browse Auctions
                            </ShinyButton>
                        </Link>
                        <Link href="/auction/create" className="group flex items-center space-x-2 text-white hover:text-yellow-400 transition-colors">
                            <span>Create Auction</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </RevealOnScroll>
            </section>

            {/* Features Grid */}
            <section className="py-24 px-4 lg:px-12 max-w-7xl mx-auto">
                <RevealOnScroll className="mb-16">
                    <h2 className="text-4xl md:text-5xl font-display mb-4 text-white">Why FHE Auctions?</h2>
                    <p className="text-white/60 max-w-xl text-lg">
                        Moving beyond transparent bids to truly private, verifiable auctions on-chain.
                    </p>
                </RevealOnScroll>

                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        {
                            icon: Lock,
                            title: "Fully Private",
                            desc: "Bids are encrypted using FHE technology. No one can see your bid amount until the auction ends."
                        },
                        {
                            icon: Shield,
                            title: "Trustless",
                            desc: "Smart contracts handle everything automatically. No central authority can manipulate results."
                        },
                        {
                            icon: Zap,
                            title: "First-Price Sealed-Bid",
                            desc: "Highest bidder wins and pays their bid amount. Simple, fair, and fully encrypted."
                        }
                    ].map((feature, idx) => (
                        <RevealOnScroll key={idx}>
                            <div className="liquid-glass-card p-8 rounded-3xl h-full hover:border-yellow-500/30 transition-all">
                                <div className="glass-icon-container w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-white">
                                    <feature.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-display text-white mb-3">{feature.title}</h3>
                                <p className="text-white/70 leading-relaxed">
                                    {feature.desc}
                                </p>
                            </div>
                        </RevealOnScroll>
                    ))}
                </div>
            </section>

            {/* Platform Statistics */}
            <section className="py-24 px-4 lg:px-12 max-w-7xl mx-auto">
                <RevealOnScroll className="mb-16">
                    <h2 className="text-4xl md:text-5xl font-display mb-4 text-white">Platform Activity</h2>
                    <p className="text-white/60 max-w-xl text-lg">
                        Real-time statistics powered by The Graph subgraph.
                    </p>
                </RevealOnScroll>

                <div className="grid md:grid-cols-3 gap-8">
                    <RevealOnScroll>
                        <div className="liquid-glass-card p-8 rounded-3xl h-full hover:border-yellow-500/30 transition-all">
                            <div className="glass-icon-container w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-white">
                                <Gavel className="w-6 h-6 text-amber-500" />
                            </div>
                            <h3 className="text-2xl font-display text-white mb-3">Total Auctions</h3>
                            <p className="text-5xl font-bold text-amber-500 mb-2">
                                {loading ? "..." : stats.totalAuctions}
                            </p>
                            <p className="text-white/70 text-sm">
                                All-time auctions created
                            </p>
                        </div>
                    </RevealOnScroll>

                    <RevealOnScroll>
                        <div className="liquid-glass-card p-8 rounded-3xl h-full hover:border-yellow-500/30 transition-all">
                            <div className="glass-icon-container w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-white">
                                <Activity className="w-6 h-6 text-emerald-500" />
                            </div>
                            <h3 className="text-2xl font-display text-white mb-3">Live Now</h3>
                            <p className="text-5xl font-bold text-emerald-500 mb-2">
                                {loading ? "..." : stats.activeAuctions}
                            </p>
                            <p className="text-white/70 text-sm">
                                Active auctions right now
                            </p>
                        </div>
                    </RevealOnScroll>

                    <RevealOnScroll>
                        <div className="liquid-glass-card p-8 rounded-3xl h-full hover:border-yellow-500/30 transition-all">
                            <div className="glass-icon-container w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-white">
                                <Users className="w-6 h-6 text-blue-500" />
                            </div>
                            <h3 className="text-2xl font-display text-white mb-3">Total Bids</h3>
                            <p className="text-5xl font-bold text-blue-500 mb-2">
                                {loading ? "..." : stats.totalBids}
                            </p>
                            <p className="text-white/70 text-sm">
                                Encrypted bids placed
                            </p>
                        </div>
                    </RevealOnScroll>
                </div>
            </section>

            {/* Live Auctions */}
            <section className="py-24 px-4 lg:px-12 max-w-7xl mx-auto">
                <RevealOnScroll className="mb-16">
                    <div className="flex items-center justify-between">
                        <h2 className="text-4xl md:text-5xl font-display text-white">🔴 Live Auctions</h2>
                        <Link href="/auctions">
                            <Button variant="ghost" className="text-white hover:text-yellow-400">
                                View All
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </RevealOnScroll>

                <RevealOnScroll>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <LoadingSpinner size="lg" />
                        </div>
                    ) : (
                        <AuctionCarousel auctions={auctions} />
                    )}
                </RevealOnScroll>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10 bg-black pt-16 pb-8 px-6 lg:px-12">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center pt-8">
                        <p className="text-white/20 text-xs">
                            © {new Date().getFullYear()} FHE Auctions. Powered by Zama FHEVM.
                        </p>
                        <div className="flex space-x-6 mt-4 md:mt-0">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-white/40 text-xs font-mono">System Operational</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
