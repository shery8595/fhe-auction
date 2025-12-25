'use client';

import { useState } from 'react';
import { Icons } from '@/lib/docs/constants';

interface CodeBlockProps {
    code: string;
    language?: string;
}

export default function CodeBlock({ code, language = 'bash' }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group my-6">
            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={handleCopy}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg border border-zinc-700 transition-colors"
                >
                    {copied ? <span className="text-[10px] font-bold text-green-400 px-1">COPIED</span> : <Icons.Copy />}
                </button>
            </div>
            <div className="bg-[#0e0e11] rounded-xl border border-zinc-800 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/50 bg-zinc-900/30">
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">{language}</span>
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                    </div>
                </div>
                <pre className="p-5 text-sm overflow-x-auto text-zinc-300">
                    <code>{code}</code>
                </pre>
            </div>
        </div>
    );
}
