'use client';

import { DOCS_STRUCTURE } from '@/lib/docs/constants';
import { NavGroup } from '@/lib/docs/types';

interface SidebarProps {
    activeSection: string;
    onNavigate: (id: string) => void;
}

export default function Sidebar({ activeSection, onNavigate }: SidebarProps) {
    return (
        <aside className="fixed left-0 top-0 h-screen w-72 bg-[#030303]/80 border-r border-zinc-800/50 overflow-y-auto z-40 hidden lg:block backdrop-blur-3xl">
            <div className="p-10">
                <div className="flex items-center gap-4 mb-14">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center border border-white/10 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                        <span className="text-2xl">🔐</span>
                    </div>
                    <div>
                        <h2 className="text-white font-black text-xl tracking-tighter leading-none">FHE LABS</h2>
                        <span className="text-[9px] text-zinc-500 font-black tracking-[0.3em] uppercase mt-1 block opacity-60">AUCTION V1</span>
                    </div>
                </div>

                <nav className="space-y-12">
                    {DOCS_STRUCTURE.map((group: NavGroup) => (
                        <div key={group.title}>
                            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-6 px-4">
                                {group.title}
                            </h3>
                            <div className="space-y-1">
                                {group.items.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => onNavigate(item.id)}
                                        className={`group flex items-center w-full px-4 py-3 text-sm font-semibold transition-all duration-300 rounded-xl ${activeSection === item.id
                                            ? "text-white bg-blue-600/10 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)] border border-blue-500/20"
                                            : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                                            }`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full mr-4 transition-all duration-500 ${activeSection === item.id ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] scale-100" : "bg-zinc-800 scale-50"
                                            }`} />
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-[#030303] via-[#030303] to-transparent">
                <div className="p-4 glass-panel rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3 text-xs text-zinc-500 font-bold uppercase tracking-widest">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span>FHEVM v0.9 Ready</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
