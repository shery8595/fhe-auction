"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Gavel,
    History,
    Wallet as WalletIcon,
    Settings,
    Plus,
    ArrowLeft,
    CreditCard,
    ArrowDownLeft,
    ArrowUpRight,
    Lock,
    Copy,
    X,
    LogOut,
    Shield,
    BarChart3
} from "lucide-react";

interface Transaction {
    id: string;
    type: 'Deposit' | 'Withdraw' | 'Bid' | 'Refund';
    amount: string;
    date: string;
    status: 'Confirmed' | 'Pending';
    txHash: string;
}

const MOCK_TRANSACTIONS: Transaction[] = [
    { id: "t1", type: "Bid", amount: "-0.1 ETH", date: "Dec 20, 2025", status: "Confirmed", txHash: "0x3a...f92" },
    { id: "t2", type: "Deposit", amount: "+2.5 ETH", date: "Dec 18, 2025", status: "Confirmed", txHash: "0x91...e12" },
    { id: "t3", type: "Refund", amount: "+0.5 ETH", date: "Dec 15, 2025", status: "Confirmed", txHash: "0xbc...a44" }
];

const SidebarItem = ({ icon: Icon, label, active = false, href = "#" }: { icon: any, label: string, active?: boolean, href?: string }) => (
    <Link href={href} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-amber-500/10 text-amber-500 font-semibold shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
        <Icon size={20} />
        <span className="text-sm">{label}</span>
    </Link>
);

export default function WalletPage() {
    const { address, isConnected } = useAccount();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [balance, setBalance] = useState("0");
    const [copied, setCopied] = useState(false);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [depositAmount, setDepositAmount] = useState("");
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawAddress, setWithdrawAddress] = useState("");
    const [processing, setProcessing] = useState(false);
    const [lockedEscrow, setLockedEscrow] = useState("0");
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchBalance = async () => {
            if (!mounted || !isConnected || !address) return;

            try {
                if (!window.ethereum) return;

                const ethers = await import("ethers");
                const provider = new ethers.ethers.BrowserProvider(window.ethereum);
                const bal = await provider.getBalance(address);
                setBalance(ethers.ethers.formatEther(bal));
            } catch (error) {
                console.error("Error fetching balance:", error);
            }
        };

        fetchBalance();
    }, [mounted, isConnected, address]);

    // Fetch locked escrow from active bids
    useEffect(() => {
        const fetchLockedEscrow = async () => {
            if (!mounted || !isConnected || !address) return;

            try {
                if (!window.ethereum) return;

                const ethers = await import("ethers");
                const { FACTORY_ADDRESS, AUCTION_ABI } = await import("@/lib/contracts/auctionUtils");
                const { FACTORY_ABI } = await import("@/lib/contracts/factoryUtils");

                const provider = new ethers.BrowserProvider(window.ethereum);
                const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
                const auctions = await factoryContract.getDeployedAuctions();

                let totalLocked = BigInt(0); // BigInt
                const txHistory: Transaction[] = [];

                for (const auctionAddr of auctions) {
                    const contract = new ethers.Contract(auctionAddr, AUCTION_ABI, provider);

                    try {
                        const bidData = await contract.bids(address);

                        if (bidData.exists && bidData.escrowAmount > 0) {
                            totalLocked += BigInt(bidData.escrowAmount.toString());

                            // Get auction metadata for transaction history
                            const metadata = await contract.getAuctionMetadata();
                            const state = await contract.getAuctionState();

                            txHistory.push({
                                id: `bid-${auctionAddr}`,
                                type: 'Bid',
                                amount: `-${ethers.formatEther(bidData.escrowAmount)} ETH`,
                                date: new Date(Number(state.startTime) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                                status: state.ended ? 'Confirmed' : 'Pending',
                                txHash: auctionAddr.slice(0, 6) + '...' + auctionAddr.slice(-4)
                            });
                        }
                    } catch (err) {
                        // Skip auctions where user hasn't bid
                        continue;
                    }
                }

                setLockedEscrow(ethers.formatEther(totalLocked));
                setTransactions(txHistory.length > 0 ? txHistory : MOCK_TRANSACTIONS);
            } catch (error) {
                console.error("Error fetching locked escrow:", error);
                setTransactions(MOCK_TRANSACTIONS);
            }
        };

        fetchLockedEscrow();
    }, [mounted, isConnected, address]);

    const copyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleWithdraw = async () => {
        if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        if (!withdrawAddress || !withdrawAddress.startsWith("0x")) {
            alert("Please enter a valid Ethereum address");
            return;
        }

        setProcessing(true);
        try {
            if (!window.ethereum) throw new Error("No ethereum provider");

            const ethers = await import("ethers");
            const provider = new ethers.ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            const tx = await signer.sendTransaction({
                to: withdrawAddress,
                value: ethers.ethers.parseEther(withdrawAmount)
            });

            await tx.wait();
            alert(`✅ Withdrawal successful! ${withdrawAmount} ETH sent to ${withdrawAddress.slice(0, 6)}...${withdrawAddress.slice(-4)}`);

            setShowWithdrawModal(false);
            setWithdrawAmount("");
            setWithdrawAddress("");

            // Refresh balance
            const bal = await provider.getBalance(address!);
            setBalance(ethers.ethers.formatEther(bal));
        } catch (error: any) {
            console.error("Withdraw error:", error);
            alert("Withdrawal failed: " + (error.shortMessage || error.message));
        } finally {
            setProcessing(false);
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
                    <SidebarItem icon={WalletIcon} label="Wallet" active href="/wallet" />
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
                        Your <span className="text-amber-500 italic">Wallet</span>
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">Manage your funds, escrow balances, and transaction history.</p>
                </header>

                {!isConnected ? (
                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-16 text-center">
                        <Lock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Wallet Not Connected</h2>
                        <p className="text-slate-400 mb-6">Please connect your wallet to view your balance.</p>
                        <button onClick={() => router.push("/")} className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all">
                            Connect Wallet
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Wallet Card & Info */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                            <div className="lg:col-span-2 bg-gradient-to-br from-amber-500 to-amber-700 rounded-[3rem] p-10 relative overflow-hidden shadow-2xl group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] -mr-32 -mt-32"></div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-16">
                                        <div className="p-4 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10">
                                            <CreditCard size={32} className="text-white" />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-black/60 text-[10px] font-black uppercase tracking-widest mb-1">Network</p>
                                            <p className="text-white font-bold">Ethereum Sepolia</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-black/60 text-xs font-bold uppercase tracking-[0.2em] mb-2">Available Balance</p>
                                        <h2 className="text-6xl font-black text-white tracking-tighter mb-8">
                                            {parseFloat(balance).toFixed(4)} <span className="text-2xl font-medium">ETH</span>
                                        </h2>
                                        <div className="flex flex-wrap gap-4">
                                            <button
                                                onClick={() => setShowDepositModal(true)}
                                                className="px-8 py-3 bg-black text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-900 transition-all shadow-xl active:scale-95"
                                            >
                                                <Plus size={18} /> Deposit
                                            </button>
                                            <button
                                                onClick={() => setShowWithdrawModal(true)}
                                                className="px-8 py-3 bg-white/20 backdrop-blur-md text-white rounded-xl font-bold flex items-center gap-2 hover:bg-white/30 transition-all border border-white/10 active:scale-95"
                                            >
                                                <ArrowUpRight size={18} /> Withdraw
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
                                            <Lock size={20} />
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Locked in Escrow</p>
                                            <p className="text-2xl font-bold text-white tracking-tight">{parseFloat(lockedEscrow).toFixed(4)} ETH</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed">These funds are currently held in active smart contracts for your pending bids.</p>
                                </div>
                                <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">Wallet Address</p>
                                    <p className="text-sm font-mono text-white break-all mb-4">{address}</p>
                                    <button
                                        onClick={copyAddress}
                                        className="text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <Copy size={14} />
                                        {copied ? "Copied!" : "Copy Address"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <section>
                            <h3 className="text-2xl font-bold text-white mb-8 tracking-tight">Recent Activity</h3>
                            <div className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden">
                                {transactions.map((tx, idx) => (
                                    <div key={tx.id} className={`p-6 flex items-center justify-between hover:bg-white/5 transition-all ${idx !== transactions.length - 1 ? 'border-b border-white/5' : ''}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl ${tx.type === 'Deposit' || tx.type === 'Refund' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                {tx.type === 'Deposit' || tx.type === 'Refund' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                            </div>
                                            <div>
                                                <p className="text-white font-bold tracking-tight">{tx.type} Funds</p>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">{tx.date} • {tx.txHash}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-lg font-black tracking-tighter ${tx.type === 'Deposit' || tx.type === 'Refund' ? 'text-emerald-400' : 'text-white'}`}>
                                                {tx.amount}
                                            </p>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{tx.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
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

            {/* Deposit Modal */}
            {showDepositModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 max-w-md w-full relative">
                        <button
                            onClick={() => setShowDepositModal(false)}
                            className="absolute top-6 right-6 p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-all"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-2xl font-bold text-white mb-2">Deposit Funds</h3>
                        <p className="text-slate-400 text-sm mb-8">Note: This is a demo. In production, you would use a bridge or faucet.</p>

                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Amount (ETH)</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    placeholder="0.1"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowDepositModal(false)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all border border-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => alert("In production, this would redirect to a faucet or bridge. For now, use the Sepolia faucet to get test ETH.")}
                                    disabled={processing}
                                    className="flex-[2] py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? "Processing..." : "Get Test ETH"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Withdraw Modal */}
            {showWithdrawModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 max-w-md w-full relative">
                        <button
                            onClick={() => setShowWithdrawModal(false)}
                            className="absolute top-6 right-6 p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-all"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-2xl font-bold text-white mb-2">Withdraw Funds</h3>
                        <p className="text-slate-400 text-sm mb-8">Send ETH to another address</p>

                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Recipient Address</label>
                                <input
                                    type="text"
                                    placeholder="0x..."
                                    value={withdrawAddress}
                                    onChange={(e) => setWithdrawAddress(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all font-mono text-sm"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Amount (ETH)</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    placeholder="0.1"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                                />
                                <p className="text-xs text-slate-500 mt-2">Available: {parseFloat(balance).toFixed(4)} ETH</p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowWithdrawModal(false)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all border border-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleWithdraw}
                                    disabled={processing}
                                    className="flex-[2] py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? "Processing..." : "Withdraw"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
