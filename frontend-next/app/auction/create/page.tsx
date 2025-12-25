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
    Send,
    Shield,
    Zap,
    Image as ImageIcon,
    Hexagon,
    Clock,
    LogOut,
    Lock,
    AlertCircle,
    X,
    Check,
    BarChart3
} from "lucide-react";
import { submitAuctionRequest } from "@/lib/contracts/factoryUtils";
import { FACTORY_ADDRESS } from "@/lib/contracts/auctionUtils";
import { fetchUserNFTs, type NFT } from "@/lib/nftUtils";

const SidebarItem = ({ icon: Icon, label, active = false, href = "#" }: { icon: any, label: string, active?: boolean, href?: string }) => (
    <Link href={href} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-amber-500/10 text-amber-500 font-semibold shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
        <Icon size={20} />
        <span className="text-sm">{label}</span>
    </Link>
);

const InputWrapper = ({ label, required = false, children }: { label: string, required?: boolean, children: React.ReactNode }) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
            {label} {required && <span className="text-amber-500">*</span>}
        </label>
        {children}
    </div>
);

export default function CreateAuctionPage() {
    const { address, isConnected } = useAccount();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // NFT state
    const [nftMode, setNftMode] = useState(false);
    const [manualNftInput, setManualNftInput] = useState(false); // Toggle between wallet selection and manual input
    const [userNFTs, setUserNFTs] = useState<NFT[]>([]);
    const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
    const [loadingNFTs, setLoadingNFTs] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        minimumBid: "",
        duration: "24", // hours
        // NFT fields (optional)
        nftContract: "",
        nftTokenId: "",
    });

    // Load user NFTs when NFT mode is enabled
    useEffect(() => {
        const loadNFTs = async () => {
            if (nftMode && address && userNFTs.length === 0) {
                setLoadingNFTs(true);
                try {
                    const nfts = await fetchUserNFTs(address);
                    setUserNFTs(nfts);
                } catch (error) {
                    console.error('Error loading NFTs:', error);
                } finally {
                    setLoadingNFTs(false);
                }
            }
        };
        loadNFTs();
    }, [nftMode, address, userNFTs.length]);

    // Handle NFT selection
    const handleNFTSelect = (nft: NFT) => {
        setSelectedNFT(nft);
        setFormData({
            ...formData,
            nftContract: nft.contractAddress,
            nftTokenId: nft.tokenId,
            title: formData.title || nft.name,
            description: formData.description || nft.description
        });
    };

    // Clear NFT selection
    const clearNFTSelection = () => {
        setSelectedNFT(null);
        setFormData({
            ...formData,
            nftContract: "",
            nftTokenId: ""
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isConnected || !address) {
            alert("Please connect your wallet first");
            return;
        }

        if (!FACTORY_ADDRESS) {
            alert("Factory contract not deployed yet");
            return;
        }

        setLoading(true);

        try {
            if (!window.ethereum) {
                throw new Error("No ethereum provider found");
            }
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            const durationMinutes = Math.round(parseFloat(formData.duration) * 60);
            const nftContract = formData.nftContract.trim() || ethers.ZeroAddress;
            const nftTokenId = formData.nftTokenId.trim() ? BigInt(formData.nftTokenId) : BigInt(0);

            const requestId = await submitAuctionRequest(
                signer,
                FACTORY_ADDRESS,
                formData.title,
                formData.description,
                durationMinutes,
                formData.minimumBid,
                nftContract,
                nftTokenId
            );

            const isNFTAuction = nftContract !== ethers.ZeroAddress;
            const message = isNFTAuction
                ? `✅ Auction request submitted! Request ID: ${requestId}\n\n📦 NFT Auction Detected\n⚠️ After admin approval, you'll need to approve the NFT transfer to the auction contract.\n\nYour auction will go live once an admin approves and deploys it.`
                : `✅ Auction request submitted! Request ID: ${requestId}\n\nYour auction will go live once an admin approves and deploys it.`;

            alert(message);

            setTimeout(() => {
                router.push("/dashboard");
            }, 1500);

        } catch (error: any) {
            console.error("Error creating auction:", error);
            alert("Failed to submit auction request: " + (error.shortMessage || error.message));
        } finally {
            setLoading(false);
        }
    };

    const workflowSteps = [
        { id: 1, title: 'Submit Request', desc: 'Fill form & submit', icon: Send, color: 'amber' },
        { id: 2, title: 'Admin Reviews', desc: 'Pending approval', icon: Shield, color: 'purple' },
        { id: 3, title: 'Deploy Contract', desc: 'Admin deploys', icon: Zap, color: 'blue' },
        { id: 4, title: 'NFT Approval', desc: 'If NFT auction', icon: ImageIcon, color: 'emerald' },
        { id: 5, title: 'Goes Live', desc: 'Listed publicly', icon: Hexagon, color: 'white' },
    ];

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
                    <SidebarItem icon={Plus} label="Create Auction" active href="/auction/create" />
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
                    <Link href="/auctions" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm mb-4 lg:hidden">
                        <ArrowLeft size={16} />
                        Back to Auctions
                    </Link>
                    <h1 className="text-4xl lg:text-6xl font-serif text-white flex items-center gap-4">
                        Create <span className="text-amber-500 italic">Auction</span>
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">Submit an auction request. An admin will review and deploy your auction.</p>
                </header>

                {/* Workflow Steps */}
                <div className="mb-16">
                    <div className="flex items-center gap-2 mb-6 text-amber-500/80">
                        <Clock size={18} />
                        <span className="text-xs font-black uppercase tracking-[0.2em]">Auction Creation Workflow</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {workflowSteps.map((step, idx) => (
                            <div key={step.id} className="relative group">
                                <div className={`h-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col items-center text-center hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 ${idx === 0 ? 'ring-1 ring-amber-500/40 bg-amber-500/[0.02]' : ''}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 border transition-colors ${idx === 0 ? 'bg-amber-500 border-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                                        {idx === 0 ? step.id : <step.icon size={20} />}
                                    </div>
                                    <h4 className={`text-xs font-bold uppercase tracking-widest mb-1 ${idx === 0 ? 'text-white' : 'text-slate-400'}`}>{step.title}</h4>
                                    <p className="text-[10px] text-slate-500 font-medium">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Form */}
                <div className="max-w-3xl mx-auto">
                    {!isConnected ? (
                        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-16 text-center">
                            <Lock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">Wallet Not Connected</h2>
                            <p className="text-slate-400 mb-6">Please connect your wallet to create an auction.</p>
                            <button onClick={() => router.push("/")} className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all">
                                Connect Wallet
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl p-12">
                            <form className="space-y-8" onSubmit={handleSubmit}>
                                <InputWrapper label="Auction Title" required>
                                    <input
                                        type="text"
                                        placeholder="e.g., Rare NFT Collection"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                                    />
                                </InputWrapper>

                                <InputWrapper label="Description" required>
                                    <textarea
                                        rows={4}
                                        placeholder="Describe what you're auctioning..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        required
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all resize-none"
                                    />
                                </InputWrapper>

                                <InputWrapper label="Minimum Bid (ETH)" required>
                                    <input
                                        type="number"
                                        step="0.001"
                                        placeholder="0.1"
                                        value={formData.minimumBid}
                                        onChange={(e) => setFormData({ ...formData, minimumBid: e.target.value })}
                                        required
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                                    />
                                </InputWrapper>

                                <InputWrapper label="Duration (hours)" required>
                                    <select
                                        value={formData.duration}
                                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                                    >
                                        <option value="0.083" className="bg-[#0a0a0a]">5 minutes (Testing)</option>
                                        <option value="1" className="bg-[#0a0a0a]">1 hour</option>
                                        <option value="6" className="bg-[#0a0a0a]">6 hours</option>
                                        <option value="12" className="bg-[#0a0a0a]">12 hours</option>
                                        <option value="24" className="bg-[#0a0a0a]">24 hours</option>
                                        <option value="48" className="bg-[#0a0a0a]">48 hours</option>
                                        <option value="168" className="bg-[#0a0a0a]">1 week</option>
                                        <option value="720" className="bg-[#0a0a0a]">1 month (30 days)</option>
                                    </select>
                                </InputWrapper>

                                <div className="space-y-6 p-6 border border-purple-500/20 rounded-2xl bg-purple-500/5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-purple-500 uppercase tracking-widest">NFT Auction</h3>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Enable NFT Mode</span>
                                            <div
                                                onClick={() => {
                                                    if (!isConnected) {
                                                        alert("Please connect your wallet first");
                                                        return;
                                                    }
                                                    setNftMode(!nftMode);
                                                    if (nftMode) {
                                                        clearNFTSelection();
                                                        setManualNftInput(false);
                                                    }
                                                }}
                                                className={`w-12 h-6 rounded-full relative transition-all ${nftMode ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-slate-800'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${nftMode ? 'left-7' : 'left-1'}`}></div>
                                            </div>
                                        </label>
                                    </div>

                                    {nftMode && (
                                        <>
                                            <p className="text-sm text-slate-400">
                                                Select an NFT from your wallet or manually enter contract details. You'll need to approve the NFT transfer after admin approval.
                                            </p>

                                            {/* Toggle between Wallet Selection and Manual Input */}
                                            <div className="flex items-center gap-2 bg-white/[0.03] p-2 rounded-xl border border-white/10">
                                                <button
                                                    type="button"
                                                    onClick={() => setManualNftInput(false)}
                                                    className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-xs transition-all ${!manualNftInput
                                                        ? 'bg-purple-500 text-black shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                                        : 'text-slate-400 hover:text-white'
                                                        }`}
                                                >
                                                    📦 Select from Wallet
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setManualNftInput(true);
                                                        setSelectedNFT(null);
                                                    }}
                                                    className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-xs transition-all ${manualNftInput
                                                        ? 'bg-purple-500 text-black shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                                        : 'text-slate-400 hover:text-white'
                                                        }`}
                                                >
                                                    ✍️ Manual Input
                                                </button>
                                            </div>

                                            {manualNftInput ? (
                                                /* Manual Input Mode */
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                                                            NFT Contract Address
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={formData.nftContract}
                                                            onChange={(e) => setFormData({ ...formData, nftContract: e.target.value })}
                                                            placeholder="0x..."
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-slate-600"
                                                        />
                                                        <p className="text-xs text-slate-500 mt-1.5">Enter the ERC-721 contract address</p>
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                                                            Token ID
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={formData.nftTokenId}
                                                            onChange={(e) => setFormData({ ...formData, nftTokenId: e.target.value })}
                                                            placeholder="1"
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-slate-600"
                                                        />
                                                        <p className="text-xs text-slate-500 mt-1.5">Enter the token ID of your NFT</p>
                                                    </div>

                                                    {formData.nftContract && formData.nftTokenId && (
                                                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                                                            <div className="flex items-start gap-3">
                                                                <Check className="text-emerald-400 mt-0.5" size={20} />
                                                                <div>
                                                                    <p className="text-emerald-400 font-bold text-sm">NFT Details Entered</p>
                                                                    <p className="text-slate-400 text-xs mt-1 font-mono break-all">
                                                                        {formData.nftContract.slice(0, 6)}...{formData.nftContract.slice(-4)} #{formData.nftTokenId}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                /* Wallet Selection Mode */
                                                <>
                                                    {/* Selected NFT Preview */}
                                                    {selectedNFT && (
                                                        <div className="p-4 bg-white/5 rounded-2xl border border-purple-500/20 relative">
                                                            <button
                                                                onClick={clearNFTSelection}
                                                                className="absolute top-2 right-2 p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                            <div className="flex items-center gap-4">
                                                                <img
                                                                    src={selectedNFT.image}
                                                                    alt={selectedNFT.name}
                                                                    className="w-20 h-20 rounded-xl object-cover border border-white/10"
                                                                />
                                                                <div className="flex-1">
                                                                    <p className="text-white font-bold">{selectedNFT.name}</p>
                                                                    <p className="text-xs text-slate-400">{selectedNFT.collectionName}</p>
                                                                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                                                                        Token #{selectedNFT.tokenId}
                                                                    </p>
                                                                </div>
                                                                <Check className="text-emerald-400" size={24} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* NFT Grid */}
                                                    {loadingNFTs ? (
                                                        <div className="p-12 text-center">
                                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                                                            <p className="text-slate-400 text-sm">Loading your NFTs...</p>
                                                        </div>
                                                    ) : userNFTs.length === 0 ? (
                                                        <div className="p-12 text-center bg-white/5 rounded-2xl border border-white/10">
                                                            <ImageIcon className="h-12 w-12 text-white/20 mx-auto mb-4" />
                                                            <p className="text-white font-bold mb-2">No NFTs Found</p>
                                                            <p className="text-slate-400 text-sm mb-4">
                                                                You don't have any ERC721 NFTs in your wallet on Sepolia testnet.
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() => setManualNftInput(true)}
                                                                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm font-bold transition-all"
                                                            >
                                                                Switch to Manual Input
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto p-2">
                                                            {userNFTs.map((nft, index) => (
                                                                <div
                                                                    key={`${nft.contractAddress}-${nft.tokenId}`}
                                                                    onClick={() => handleNFTSelect(nft)}
                                                                    className={`group cursor-pointer rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 ${selectedNFT?.contractAddress === nft.contractAddress && selectedNFT?.tokenId === nft.tokenId
                                                                        ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                                                                        : 'border-white/10 hover:border-purple-500/50'
                                                                        }`}
                                                                >
                                                                    <div className="aspect-square relative">
                                                                        <img
                                                                            src={nft.image}
                                                                            alt={nft.name}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                        {selectedNFT?.contractAddress === nft.contractAddress && selectedNFT?.tokenId === nft.tokenId && (
                                                                            <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                                                                                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                                                                                    <Check size={20} className="text-white" />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="p-3 bg-black/40">
                                                                        <p className="text-white text-sm font-bold truncate">{nft.name}</p>
                                                                        <p className="text-slate-400 text-xs truncate">{nft.collectionName}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => router.back()}
                                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all border border-white/10"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] py-4 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest rounded-2xl transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? "Submitting..." : "Submit Request"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

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
