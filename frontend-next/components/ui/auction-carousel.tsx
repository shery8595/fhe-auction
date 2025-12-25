"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

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

interface AuctionCarouselProps {
    auctions: AuctionData[];
}

export function AuctionCarousel({ auctions }: AuctionCarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const shouldAnimate = auctions.length > 5;

    useEffect(() => {
        if (!shouldAnimate) return; // Don't animate if 5 or fewer auctions

        const scrollContainer = scrollRef.current;
        if (!scrollContainer || auctions.length === 0) return;

        let animationId: number;
        let scrollPosition = 0;
        const scrollSpeed = 0.5; // pixels per frame

        const animate = () => {
            if (!scrollContainer) return;

            scrollPosition += scrollSpeed;

            // Reset scroll when we've scrolled past the first set of items
            const maxScroll = scrollContainer.scrollWidth / 2;
            if (scrollPosition >= maxScroll) {
                scrollPosition = 0;
            }

            scrollContainer.scrollLeft = scrollPosition;
            animationId = requestAnimationFrame(animate);
        };

        animationId = requestAnimationFrame(animate);

        // Pause on hover
        const handleMouseEnter = () => cancelAnimationFrame(animationId);
        const handleMouseLeave = () => {
            animationId = requestAnimationFrame(animate);
        };

        scrollContainer.addEventListener('mouseenter', handleMouseEnter);
        scrollContainer.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            cancelAnimationFrame(animationId);
            scrollContainer.removeEventListener('mouseenter', handleMouseEnter);
            scrollContainer.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [auctions, shouldAnimate]);

    if (auctions.length === 0) {
        return (
            <p className="text-white/40 text-center py-12">No live auctions at the moment</p>
        );
    }

    // Only duplicate for animation if more than 5 auctions
    const displayAuctions = shouldAnimate ? [...auctions, ...auctions, ...auctions] : auctions;

    // Static grid for 5 or fewer auctions
    if (!shouldAnimate) {
        return (
            <div className="grid md:grid-cols-3 gap-6">
                {auctions.map((auction) => (
                    <AuctionCard key={auction.address} auction={auction} />
                ))}
            </div>
        );
    }

    // Animated carousel for more than 5 auctions
    return (
        <div className="relative overflow-hidden">
            {/* Gradient overlays for fade effect */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

            {/* Scrolling container */}
            <div
                ref={scrollRef}
                className="flex gap-6 overflow-x-hidden scrollbar-hide"
                style={{ scrollBehavior: 'auto' }}
            >
                {displayAuctions.map((auction, index) => (
                    <div
                        key={`${auction.address}-${index}`}
                        className="flex-shrink-0 w-80"
                    >
                        <AuctionCard auction={auction} />
                    </div>
                ))}
            </div>
        </div>
    );
}

// Extracted card component to avoid duplication
function AuctionCard({ auction }: { auction: AuctionData }) {
    return (
        <Card className="glass-card hover:border-yellow-500/50 transition-all bg-black h-full overflow-hidden">
            {/* NFT Image */}
            {auction.nftImage && (
                <div className="relative w-full aspect-square overflow-hidden">
                    <img
                        src={auction.nftImage}
                        alt={auction.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            // Hide image if it fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                        }}
                    />
                    {/* Gradient overlay for better text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    {/* NFT Badge */}
                    <div className="absolute top-3 right-3">
                        <Badge className="bg-blue-500/90 text-white border-blue-400/50 backdrop-blur-sm">
                            NFT
                        </Badge>
                    </div>
                </div>
            )}

            <CardHeader>
                <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg text-white">{auction.title}</CardTitle>
                    <Badge variant="success">Live</Badge>
                </div>
                <div className="mt-2">
                    <Badge variant="default" className="text-xs bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                        {auction.type}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-white/60">Min Bid:</span>
                    <span className="font-semibold text-yellow-500">{auction.minBid}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-white/60">Bids:</span>
                    <span className="font-semibold text-white">{auction.bids}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-yellow-500 font-semibold">{auction.timeLeft}</span>
                </div>
            </CardContent>
            <CardFooter>
                <Link href={`/auction/${auction.address}`} className="w-full">
                    <Button variant="outline" className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10">
                        View Auction
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    );
}
