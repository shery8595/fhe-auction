'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import TableOfContents from './components/TableOfContents';
import CodeBlock from './components/CodeBlock';
import {
    EncryptionFlow,
    ComparisonFlow,
    SystemArchitecture,
    StateMachine,
    LifecycleSequence,
    UserJourneys,
    ContractInteraction,
    SubgraphFlow,
    NotificationFlow
} from './components/TechDiagram';
import { Icons } from '@/lib/docs/constants';

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState('introduction');

    const handleScroll = useCallback(() => {
        const sections = ['introduction', 'core', 'architecture', 'workflow', 'security', 'privacy', 'testing', 'notifications', 'api', 'installation', 'placing-bids'];
        let current = 'introduction';

        for (const section of sections) {
            const element = document.getElementById(section);
            if (element) {
                const rect = element.getBoundingClientRect();
                if (rect.top <= 200) {
                    current = section;
                }
            }
        }
        setActiveSection(current);
    }, []);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            window.scrollTo({
                top: element.offsetTop - 40,
                behavior: 'smooth'
            });
            setActiveSection(id);
        }
    };

    return (
        <div className="min-h-screen selection:bg-blue-500/30 bg-[#030303]">
            <Sidebar activeSection={activeSection} onNavigate={scrollToSection} />

            <main className="lg:ml-72 xl:mr-64 min-h-screen">
                <div className="max-w-4xl mx-auto px-6 py-20 lg:px-12 xl:px-16">

                    {/* Introduction */}
                    <section id="introduction" className="mb-40 scroll-mt-20">
                        <header className="mb-16">
                            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full glass-panel text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mb-8">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                TECHNICAL PROTOCOL v1.0.4
                            </div>
                            <h1 className="text-6xl font-extrabold text-white tracking-tight mb-8 leading-[1.1]">
                                FHE Auction <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Infrastructure</span>
                            </h1>
                            <p className="text-xl text-zinc-400 leading-relaxed max-w-2xl font-light">
                                Privacy-preserving sealed-bid auction platform, built on <span className="text-white font-medium">Zama's FHEVM v0.9</span>.
                                Truly confidential bidding where bid amounts remain encrypted throughout the lifecycle.
                            </p>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
                            {[
                                { icon: "🔒", title: "End-to-End Privacy", desc: "Bid amounts are encrypted client-side and never revealed during calculation." },
                                { icon: "⚡", title: "Instant Verification", desc: "Cryptographic proofs ensure the winner is valid without leaking amounts." },
                                { icon: "🎨", title: "Asset Escrow", desc: "Native support for ERC-721 and ERC-1155 collectible targets." },
                                { icon: "📈", title: "On-chain Indexing", desc: "Real-time state tracking powered by decentralized subgraphs." }
                            ].map((item, i) => (
                                <div key={i} className="group p-8 glass-panel rounded-3xl hover:bg-zinc-900/40 hover:border-zinc-700/50 transition-all duration-500">
                                    <div className="text-3xl mb-6">{item.icon}</div>
                                    <h3 className="text-white font-bold text-lg mb-3 tracking-tight">{item.title}</h3>
                                    <p className="text-zinc-500 text-sm leading-relaxed font-medium">{item.desc}</p>
                                </div>
                            ))}
                        </div>

                        <article className="prose prose-invert prose-zinc max-w-none">
                            <h3 className="text-3xl font-bold text-white mb-6">User Flow Overview</h3>
                            <p className="text-zinc-400 text-lg leading-relaxed mb-10 font-light">
                                The platform caters to two primary user roles, each with a streamlined, encrypted interaction path designed for maximum security.
                            </p>
                            <UserJourneys />
                        </article>
                    </section>

                    {/* Core Concepts */}
                    <section id="core" className="mb-40 scroll-mt-20">
                        <h2 className="text-4xl font-extrabold text-white mb-10 flex items-center gap-6">
                            <span className="text-blue-500/40 font-mono text-3xl">01</span> Protocol Core
                        </h2>
                        <StateMachine />
                        <h3 className="text-2xl font-bold text-white mb-6 mt-20 tracking-tight">FHE Encryption Flow</h3>
                        <EncryptionFlow />
                        <ComparisonFlow />
                    </section>

                    {/* Architecture */}
                    <section id="architecture" className="mb-40 scroll-mt-20">
                        <h2 className="text-4xl font-extrabold text-white mb-10 flex items-center gap-6">
                            <span className="text-blue-500/40 font-mono text-3xl">02</span> System Stack
                        </h2>
                        <SystemArchitecture />
                        <ContractInteraction />
                    </section>

                    {/* Workflow */}
                    <section id="workflow" className="mb-40 scroll-mt-20">
                        <h2 className="text-4xl font-extrabold text-white mb-10 flex items-center gap-6">
                            <span className="text-blue-500/40 font-mono text-3xl">03</span> FHEVM Workflow
                        </h2>
                        <LifecycleSequence />
                        <SubgraphFlow />
                    </section>

                    {/* Security */}
                    <section id="security" className="mb-40 scroll-mt-20">
                        <h2 className="text-4xl font-extrabold text-white mb-10 flex items-center gap-6">
                            <span className="text-blue-500/40 font-mono text-3xl">04</span> Security Model
                        </h2>
                        <div className="p-10 glass-panel rounded-[32px] border border-blue-500/10 hover:border-blue-500/20 transition-all">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                                    <Icons.Shield />
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Privacy Design Principles</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <h5 className="text-sm font-black text-zinc-500 uppercase tracking-widest">Confidentiality</h5>
                                    <p className="text-sm text-zinc-400 leading-relaxed">No validator can view the bid amounts. Only the KMS can decrypt results based on threshold signatures.</p>
                                </div>
                                <div className="space-y-4">
                                    <h5 className="text-sm font-black text-zinc-500 uppercase tracking-widest">Verifiability</h5>
                                    <p className="text-sm text-zinc-400 leading-relaxed">All computations are deterministic and verified on-chain. Decryption proofs must be submitted by the reveal agent.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Privacy Features Implementation */}
                    <section id="privacy" className="mb-40 scroll-mt-20">
                        <h2 className="text-4xl font-extrabold text-white mb-10 flex items-center gap-6">
                            <span className="text-blue-500/40 font-mono text-3xl">05</span> Privacy Implementation
                        </h2>
                        <p className="text-zinc-400 mb-10 text-lg font-light leading-relaxed">
                            Zama FHEVM v0.9 powers a suit of privacy features that shield auction mechanics from prying eyes.
                        </p>

                        <div className="grid grid-cols-1 gap-6 mb-16">
                            <div className="overflow-hidden glass-panel rounded-3xl border border-zinc-800">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-zinc-900/50 border-b border-zinc-800">
                                            <th className="px-8 py-5 font-bold text-zinc-400 tracking-widest uppercase text-[10px]">Privacy Component</th>
                                            <th className="px-8 py-5 font-bold text-zinc-400 tracking-widest uppercase text-[10px]">Benefit</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/50 text-zinc-400">
                                        {[
                                            { f: "Encrypted Bids", b: "Bid amounts hidden until auction ends" },
                                            { f: "Encrypted Winner", b: "Winner identity hidden during active phase" },
                                            { f: "Private Reserve", b: "Minimum price hidden from bidders to prevent strategic gaming" },
                                            { f: "Hidden Bidder Count", b: "Total participation volume obscured during live bidding" },
                                            { f: "Self-Relaying Decryption", b: "Oracle-free verifiable decryption via v0.9" }
                                        ].map((row, i) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                                <td className="px-8 py-6 font-bold text-white">{row.f}</td>
                                                <td className="px-8 py-6 text-xs">{row.b}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-6 mt-20 tracking-tight">Access Control & FHE Select</h3>
                        <p className="text-zinc-500 text-sm mb-8">
                            We use <code>FHE.allow()</code> to ensure only the authorized contract and the bidder can interact with the encrypted data.
                        </p>
                        <CodeBlock code={`// Grant access permissions
FHE.allowThis(bidAmount);           // Contract can use this value
FHE.allow(bidAmount, msg.sender);   // Bidder can decrypt their own bid

// Compare without revealing
ebool isGreater = FHE.gt(currentBid, maxBid);
maxBid = FHE.select(isGreater, currentBid, maxBid);`} language="solidity" />
                    </section>

                    {/* Testing */}
                    <section id="testing" className="mb-40 scroll-mt-20">
                        <h2 className="text-4xl font-extrabold text-white mb-10 flex items-center gap-6">
                            <span className="text-blue-500/40 font-mono text-3xl">06</span> Testing & Reliability
                        </h2>

                        <div className="mb-12 glass-panel rounded-3xl p-10 border border-green-500/20 bg-green-500/5">
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <div className="flex-shrink-0 w-24 h-24 bg-green-500/10 rounded-full border border-green-500/40 flex items-center justify-center text-green-400">
                                    <span className="text-3xl font-black">100%</span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">85/85 Passing Tests 🎉</h3>
                                    <p className="text-zinc-400 font-medium leading-relaxed">
                                        Comprehensive coverage across factory deployment, FHE operations, and edge cases.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                            <div className="p-6 glass-panel rounded-2xl border border-zinc-800">
                                <div className="text-blue-400 font-bold text-xs uppercase mb-4">AuctionFactory.test.ts</div>
                                <div className="space-y-2">
                                    {["Initialization (5)", "Requests (9)", "Registration (7)", "Rejections (4)", "View Queries (6)"].map((t, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs text-zinc-500">
                                            <Icons.CheckCircle />
                                            {t}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-6 glass-panel rounded-2xl border border-zinc-800">
                                <div className="text-purple-400 font-bold text-xs uppercase mb-4">FirstPriceAuction.test.ts</div>
                                <div className="space-y-2">
                                    {["Encryption Flow (11)", "Termination (6)", "NFT Support (6)", "Performance (1)", "Edge Cases (4)"].map((t, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs text-zinc-500">
                                            <Icons.CheckCircle />
                                            {t}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <CodeBlock code={`# Run full protocol suite\nnpx hardhat test\n\n# Scalability Verification\nnpx hardhat test test/Scalability.test.ts`} language="bash" />
                    </section>

                    {/* Email Notifications */}
                    <section id="notifications" className="mb-40 scroll-mt-20">
                        <h2 className="text-4xl font-extrabold text-white mb-10 flex items-center gap-6">
                            <span className="text-blue-500/40 font-mono text-3xl">07</span> Email Notifications
                        </h2>
                        <p className="text-zinc-400 mb-10 text-lg font-light leading-relaxed">
                            Automated notifications via <span className="text-white">Resend</span> for seamless participant engagement.
                        </p>

                        <NotificationFlow />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                            {[
                                { type: "Auction Ended", role: "Seller", color: "border-orange-500/20 bg-orange-500/5", icon: "🔨", desc: "Alerts seller to reveal winner." },
                                { type: "Winner Reveal", role: "Winner", color: "border-green-500/20 bg-green-500/5", icon: "🏆", desc: "Step-by-step NFT claim instructions." },
                                { type: "Auction Result", role: "Bidders", color: "border-blue-500/20 bg-blue-500/5", icon: "📊", desc: "Refund status and result summary." }
                            ].map((card, i) => (
                                <div key={i} className={`p-8 rounded-[32px] border ${card.color} glass-panel`}>
                                    <div className="text-3xl mb-6">{card.icon}</div>
                                    <h4 className="text-white font-bold text-lg mb-1">{card.type}</h4>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">{card.role}</div>
                                    <p className="text-zinc-400 text-xs leading-relaxed">{card.desc}</p>
                                </div>
                            ))}
                        </div>

                        <CodeBlock code={`POST /api/send-notification\n{\n  "to": "recipient@example.com",\n  "type": "winner_announced",\n  "data": { "auctionTitle": "Rare Artifact", "winningBid": "5.5 ETH" }\n}`} language="json" />
                    </section>

                    {/* API Reference */}
                    <section id="api" className="mb-40 scroll-mt-20">
                        <h2 className="text-4xl font-extrabold text-white mb-10 flex items-center gap-6">
                            <span className="text-blue-500/40 font-mono text-3xl">08</span> API Reference
                        </h2>
                        <div className="overflow-hidden glass-panel rounded-3xl border border-zinc-800">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-zinc-900/50 border-b border-zinc-800">
                                        <th className="px-8 py-5 font-bold text-zinc-400 tracking-widest uppercase text-[10px]">Method</th>
                                        <th className="px-8 py-5 font-bold text-zinc-400 tracking-widest uppercase text-[10px]">Params</th>
                                        <th className="px-8 py-5 font-bold text-zinc-400 tracking-widest uppercase text-[10px]">Type</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                                    <tr className="hover:bg-white/5 transition-colors">
                                        <td className="px-8 py-6 font-mono text-blue-400">placeBid()</td>
                                        <td className="px-8 py-6 text-zinc-500 italic">euint32, bytes proof</td>
                                        <td className="px-8 py-6"><span className="px-2 py-0.5 bg-zinc-800 rounded text-[9px] text-zinc-400 font-black uppercase tracking-widest">External</span></td>
                                    </tr>
                                    <tr className="hover:bg-white/5 transition-colors">
                                        <td className="px-8 py-6 font-mono text-blue-400">revealWinner()</td>
                                        <td className="px-8 py-6 text-zinc-500 italic">uint32, bytes proof</td>
                                        <td className="px-8 py-6"><span className="px-2 py-0.5 bg-zinc-800 rounded text-[9px] text-zinc-400 font-black uppercase tracking-widest">Public</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Installation */}
                    <section id="installation" className="mb-40 scroll-mt-20">
                        <h2 className="text-4xl font-extrabold text-white mb-10 flex items-center gap-6">
                            <span className="text-blue-500/40 font-mono text-3xl">09</span> Installation
                        </h2>
                        <div className="bg-zinc-900/20 p-8 rounded-3xl border border-zinc-800">
                            <CodeBlock code={`git clone https://github.com/fhe-auction/protocol.git\nnpm install\nnpx hardhat node --network fhevm\n\n# Configure Environment\nRESEND_API_KEY=re_xxx\nSEPOLIA_RPC=xxx`} />
                        </div>
                    </section>

                    {/* Placing Bids Guide */}
                    <section id="placing-bids" className="mb-40 scroll-mt-20">
                        <h2 className="text-4xl font-extrabold text-white mb-10 flex items-center gap-6">
                            <span className="text-blue-500/40 font-mono text-3xl">10</span> How to Place a Bid
                        </h2>

                        <div className="space-y-12">
                            {[
                                { s: "1", t: "Connect Wallet", d: "Use MetaMask or any Web3 wallet. Ensure you are on the Sepolia Testnet (Chain ID: 11155111)." },
                                { s: "2", t: "Enter Bid Amount", d: "Input your bid. The Zama SDK will immediately salt and encrypt this value locally." },
                                { s: "3", t: "Set Escrow", d: "A public escrow (>= bid) is required to guarantee final settlement. This is fully refundable." },
                                { s: "4", t: "Sign & Submit", d: "Confirm the transaction. Your bid is transmitted as an opaque handle to the EVM." }
                            ].map((step, i) => (
                                <div key={i} className="flex gap-8 group">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-full glass-panel border border-blue-500/30 flex items-center justify-center text-blue-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        {step.s}
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold text-xl mb-2 tracking-tight">{step.t}</h4>
                                        <p className="text-zinc-500 leading-relaxed font-light">{step.d}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-20 p-10 glass-panel rounded-[40px] border border-zinc-800 bg-zinc-900/10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
                                    <Icons.Shield />
                                </div>
                                <h3 className="text-white font-bold text-lg">Guaranteed Escrow Safety</h3>
                            </div>
                            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                                Your escrow is held by the smart contract's immutable logic. If you do not win the auction, your funds are automatically available for claim immediately after the reveal phase.
                            </p>
                            <div className="flex gap-4">
                                <button className="px-6 py-2.5 bg-blue-600 rounded-xl text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-500 transition-colors">Start Bidding</button>
                                <button className="px-6 py-2.5 glass-panel rounded-xl text-zinc-400 text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-colors">View Faucet</button>
                            </div>
                        </div>
                    </section>

                    {/* Footer */}
                    <footer className="pt-32 pb-16 border-t border-zinc-800/50">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                            <div>
                                <div className="text-white font-bold text-lg mb-2 leading-none">FHE Auction</div>
                                <p className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest mt-2">Privacy Primitive Architecture</p>
                            </div>
                            <div className="flex gap-10">
                                <a href="#" className="text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">GitHub</a>
                                <a href="#" className="text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Discord</a>
                            </div>
                        </div>
                        <div className="mt-16 text-center">
                            <p className="text-zinc-700 text-[10px] uppercase font-black tracking-[0.4em]">© 2024 FHE LABS PROTOCOL GROUP</p>
                        </div>
                    </footer>
                </div>
            </main>

            <TableOfContents activeSection={activeSection} />
        </div>
    );
}
