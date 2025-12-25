'use client';

import { DOCS_STRUCTURE } from '@/lib/docs/constants';

interface TOCProps {
    activeSection: string;
}

export default function TableOfContents({ activeSection }: TOCProps) {
    const allItems = DOCS_STRUCTURE.flatMap(g => g.items);

    return (
        <aside className="fixed right-0 top-0 h-screen w-64 border-l border-zinc-800/50 hidden xl:block p-10">
            <div className="mb-6">
                <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-6">
                    On This Page
                </h3>
                <nav className="space-y-3">
                    {allItems.map((item) => (
                        <a
                            key={item.id}
                            href={`#${item.id}`}
                            className={`block text-xs font-medium transition-all duration-200 border-l-2 pl-4 py-0.5 ${activeSection === item.id
                                ? "text-blue-400 border-blue-500"
                                : "text-zinc-500 border-transparent hover:text-zinc-300 hover:border-zinc-700"
                                }`}
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>
            </div>

            <div className="mt-12 pt-8 border-t border-zinc-800/50">
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                        Need help? Join our developer discord or check out our Github.
                    </p>
                    <button className="mt-4 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors">
                        Ask a Question
                    </button>
                </div>
            </div>
        </aside>
    );
}
