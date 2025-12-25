// 1. Complete System Architecture Diagram
export const SystemArchitecture = () => (
    <div className="flex flex-col gap-4 my-10 relative">
        {[
            { label: "User Interface", tech: "Next.js / React / MetaMask", color: "bg-blue-600" },
            { label: "Web3 Integration", tech: "Wagmi + Ethers.js / Viem", color: "bg-indigo-600" },
            { label: "FHE SDK", tech: "Zama Relayer SDK (TFHE-rs)", color: "bg-purple-600" },
            { label: "Smart Contracts", tech: "Solidity + FHEVM Protocol", color: "bg-pink-600" },
            { label: "Execution Layer", tech: "Sepolia Testnet / Zama L1", color: "bg-red-600" }
        ].map((layer, i) => (
            <div key={i} className="group relative">
                <div className="flex items-center gap-6 p-5 bg-[#0a0a0c] border border-white/5 rounded-2xl group-hover:border-white/10 transition-all duration-300">
                    <div className={`w-3 h-3 rounded-full ${layer.color} shadow-[0_0_10px_rgba(255,255,255,0.2)]`} />
                    <div className="flex-1">
                        <h4 className="text-white font-bold text-sm tracking-tight">{layer.label}</h4>
                        <p className="text-zinc-500 text-[10px] font-mono mt-1">{layer.tech}</p>
                    </div>
                </div>
                {i < 4 && (
                    <div className="flex justify-center my-1">
                        <div className="h-4 w-px bg-zinc-800" />
                    </div>
                )}
            </div>
        ))}
        <div className="absolute -right-8 top-0 bottom-0 w-1 bg-zinc-800/50 rounded-full hidden xl:block">
            <div className="sticky top-1/2 -translate-y-1/2 bg-zinc-900 border border-zinc-700 px-3 py-1 rounded-full whitespace-nowrap -rotate-90 origin-right mr-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                The Graph Indexing
            </div>
        </div>
    </div>
);

// 2. FHE Encryption Flow
export const EncryptionFlow = () => (
    <div className="bg-zinc-900/40 rounded-3xl border border-zinc-800/80 p-8 my-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 w-full bg-[#0a0a0c] border border-blue-500/20 rounded-2xl p-6 text-center">
                <div className="text-blue-400 font-bold text-xs uppercase mb-2">Plaintext Bid</div>
                <div className="text-white text-lg font-mono font-semibold">5.00 ETH</div>
                <div className="mt-4 flex justify-center opacity-40">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                </div>
            </div>

            <div className="flex flex-col items-center">
                <div className="px-4 py-1.5 bg-blue-600 rounded-full text-white text-[10px] font-black uppercase mb-2">fhe.encrypt()</div>
                <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </div>

            <div className="flex-1 w-full bg-[#0a0a0c] border border-purple-500/20 rounded-2xl p-6 text-center">
                <div className="text-purple-400 font-bold text-xs uppercase mb-2">Ciphertext Handle</div>
                <div className="text-zinc-400 text-xs font-mono break-all leading-tight">0x4a7f...3d82</div>
                <div className="mt-4 flex justify-center">
                    <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
            </div>
        </div>
    </div>
);

// 3. State Machine Diagram
export const StateMachine = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-12">
        {[
            { id: "PENDING", desc: "Initial validation", color: "bg-zinc-800" },
            { id: "ACTIVE", desc: "Bidding window open", color: "bg-blue-600" },
            { id: "ENDED", desc: "Homomorphic calculation", color: "bg-purple-600" },
            { id: "REVEALED", desc: "Winner declared", color: "bg-green-600" }
        ].map((state, i) => (
            <div key={state.id} className="relative bg-[#0a0a0c] border border-zinc-800 p-6 rounded-2xl flex flex-col items-center text-center">
                <div className={`w-8 h-8 ${state.color} rounded-lg mb-4 flex items-center justify-center text-white font-bold text-xs`}>{i + 1}</div>
                <h4 className="text-white font-bold text-xs tracking-widest uppercase mb-2">{state.id}</h4>
                <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-tighter">{state.desc}</p>
                {i < 3 && <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 text-zinc-700 z-10">→</div>}
            </div>
        ))}
    </div>
);

// 4. Lifecycle Sequence Diagram
export const LifecycleSequence = () => (
    <div className="bg-zinc-900/40 rounded-3xl border border-zinc-800/80 p-8 my-8 font-mono text-[10px]">
        <div className="flex justify-between border-b border-zinc-800 pb-4 mb-4 text-zinc-500 font-bold uppercase tracking-widest">
            <span>Entity</span>
            <span>Action</span>
            <span>Target</span>
        </div>
        <div className="space-y-4">
            {[
                { from: "Seller", action: "Deploy Auction", to: "Factory", color: "text-blue-400" },
                { from: "Bidder", action: "Submit Encrypted Bid", to: "Contract", color: "text-purple-400" },
                { from: "Timer", action: "Block Height Met", to: "Trigger", color: "text-red-400" },
                { from: "Admin", action: "Call endAuction()", to: "KMS", color: "text-orange-400" },
                { from: "Relayer", action: "Generate Proof", to: "Client", color: "text-green-400" },
                { from: "Client", action: "revealWinner(proof)", to: "Contract", color: "text-cyan-400" }
            ].map((step, i) => (
                <div key={i} className="flex items-center gap-4">
                    <span className="w-20 text-white font-bold">{step.from}</span>
                    <div className="flex-1 h-px bg-zinc-800 relative">
                        <span className={`absolute left-1/2 -translate-x-1/2 -translate-y-4 font-bold ${step.color} whitespace-nowrap`}>—— {step.action} ——▶</span>
                    </div>
                    <span className="w-20 text-white font-bold text-right">{step.to}</span>
                </div>
            ))}
        </div>
    </div>
);

// 5. User Journey Diagram
export const UserJourneys = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-10">
        <div className="bg-[#0a0a0c] border border-blue-500/10 rounded-3xl p-8">
            <h4 className="text-blue-400 font-bold text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                Bidder Journey
            </h4>
            <div className="space-y-4">
                {["Connect Wallet", "Browse Active Auctions", "Select Target", "Sign Encrypted Bid", "Wait for End", "Verify Result"].map((step, i) => (
                    <div key={i} className="flex items-center gap-4 text-xs">
                        <span className="text-zinc-600 font-mono">{i + 1}.</span>
                        <span className="text-zinc-400 font-medium">{step}</span>
                    </div>
                ))}
            </div>
        </div>
        <div className="bg-[#0a0a0c] border border-purple-500/10 rounded-3xl p-8">
            <h4 className="text-purple-400 font-bold text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                Seller Journey
            </h4>
            <div className="space-y-4">
                {["Connect Wallet", "Deploy Auction Instance", "Escrow NFT Target", "Monitor Encrypted State", "Trigger Settlement", "Receive Payment"].map((step, i) => (
                    <div key={i} className="flex items-center gap-4 text-xs">
                        <span className="text-zinc-600 font-mono">{i + 1}.</span>
                        <span className="text-zinc-400 font-medium">{step}</span>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// 6. Contract Interaction Diagram
export const ContractInteraction = () => (
    <div className="relative h-64 my-10 flex items-center justify-center">
        <div className="absolute w-48 h-48 border border-dashed border-zinc-800 rounded-full animate-[spin_60s_linear_infinite]" />
        <div className="z-10 bg-blue-600 p-4 rounded-2xl shadow-xl text-white font-bold text-xs text-center border border-white/20">
            AuctionFactory
        </div>
        <div className="absolute top-0 bg-[#0a0a0c] border border-zinc-700 px-3 py-1.5 rounded-lg text-zinc-400 text-[10px] font-bold">FirstPriceAuction.sol</div>
        <div className="absolute bottom-0 bg-[#0a0a0c] border border-zinc-700 px-3 py-1.5 rounded-lg text-zinc-400 text-[10px] font-bold">BaseAuction.sol (Inheritance)</div>
        <div className="absolute left-0 bg-[#0a0a0c] border border-zinc-700 px-3 py-1.5 rounded-lg text-zinc-400 text-[10px] font-bold">ERC721.sol</div>
        <div className="absolute right-0 bg-[#0a0a0c] border border-zinc-700 px-3 py-1.5 rounded-lg text-zinc-400 text-[10px] font-bold">FHEVM.lib</div>
    </div>
);

// 7. Subgraph Event Flow Diagram
export const SubgraphFlow = () => (
    <div className="bg-zinc-900/40 rounded-3xl border border-zinc-800/80 p-8 my-8">
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-xl text-pink-400 text-[10px] font-bold uppercase tracking-widest">
                    Smart Contract Event
                </div>
                <div className="h-px flex-1 bg-zinc-800 mx-4" />
                <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-[10px] font-bold uppercase tracking-widest">
                    Graph Node Listener
                </div>
            </div>
            <div className="flex items-center justify-between">
                <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-[10px] font-bold uppercase tracking-widest">
                    Mapping Handler
                </div>
                <div className="h-px flex-1 bg-zinc-800 mx-4" />
                <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-[10px] font-bold uppercase tracking-widest">
                    Schema Entity Update
                </div>
            </div>
            <div className="flex items-center justify-between">
                <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-[10px] font-bold uppercase tracking-widest">
                    GraphQL Store
                </div>
                <div className="h-px flex-1 bg-zinc-800 mx-4" />
                <div className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-[10px] font-bold uppercase tracking-widest">
                    Frontend Query (Apollo)
                </div>
            </div>
        </div>
    </div>
);

// 8. Notification Flow
export const NotificationFlow = () => (
    <div className="bg-zinc-900/40 rounded-3xl border border-zinc-800/80 p-8 my-8">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 relative">
            <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 glass-panel border-white/10 rounded-2xl flex items-center justify-center text-xl">⛓️</div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Event Emit</span>
            </div>
            <div className="text-zinc-700">▶</div>
            <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 text-xs font-bold">API</div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Route</span>
            </div>
            <div className="text-zinc-700">▶</div>
            <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-purple-600/20 border border-purple-500/30 rounded-2xl flex items-center justify-center text-xl">🚀</div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Resend</span>
            </div>
            <div className="text-zinc-700">▶</div>
            <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 glass-panel border-green-500/20 rounded-2xl flex items-center justify-center text-xl">📧</div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Recipient</span>
            </div>
        </div>
    </div>
);

// 9. Comparison Flow
export const ComparisonFlow = () => (
    <div className="bg-zinc-900/40 rounded-3xl border border-zinc-800/80 p-10 my-8">
        <div className="flex flex-col items-center space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-12 w-full">
                <div className="bg-[#0a0a0c] border border-zinc-800 rounded-2xl p-6 text-center">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Bid A (Ciphertext)</div>
                    <div className="text-blue-400 font-mono text-sm px-4 py-2 bg-blue-400/5 rounded-lg border border-blue-500/10 inline-block">enc(3)</div>
                </div>

                <div className="flex flex-col items-center">
                    <div className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white text-sm font-bold shadow-xl">
                        FHE.gt()
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-4 font-bold uppercase tracking-widest">Homomorphic Op</div>
                </div>

                <div className="bg-[#0a0a0c] border border-zinc-800 rounded-2xl p-6 text-center">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Bid B (Ciphertext)</div>
                    <div className="text-green-400 font-mono text-sm px-4 py-2 bg-green-400/5 rounded-lg border border-green-500/10 inline-block">enc(5)</div>
                </div>
            </div>

            <div className="h-10 w-px bg-zinc-800" />

            <div className="w-full max-w-md bg-orange-500/5 border border-orange-500/20 rounded-2xl p-8 text-center relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-orange-500 rounded-full text-[10px] text-white font-black uppercase">Result</div>
                <div className="text-orange-400 font-bold text-lg mb-2">Ciphertext(false)</div>
                <p className="text-zinc-500 text-xs leading-relaxed italic">
                    Computation succeeded on-chain without any party (including validators) seeing the actual values.
                </p>
            </div>
        </div>
    </div>
);
