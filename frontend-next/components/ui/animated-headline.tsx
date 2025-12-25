"use client";

import { useState, useEffect } from 'react';

export const AnimatedHeadline = () => {
    const [text, setText] = useState("Private");
    const [phase, setPhase] = useState<'idle' | 'deleting' | 'typing' | 'finished'>('idle');
    const [cursorVisible, setCursorVisible] = useState(true);

    // Blinking cursor effect
    useEffect(() => {
        const cursorInterval = setInterval(() => {
            setCursorVisible(prev => !prev);
        }, 500);
        return () => clearInterval(cursorInterval);
    }, []);

    // Typing animation logic
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;

        if (phase === 'idle') {
            timeout = setTimeout(() => setPhase('deleting'), 2000);
        } else if (phase === 'deleting') {
            if (text.length > 0) {
                timeout = setTimeout(() => setText(prev => prev.slice(0, -1)), 100);
            } else {
                setPhase('typing');
            }
        } else if (phase === 'typing') {
            const fullText = "Encrypted";
            if (text.length < fullText.length) {
                timeout = setTimeout(() => setText(fullText.slice(0, text.length + 1)), 150);
            } else {
                setPhase('finished');
            }
        }

        return () => clearTimeout(timeout);
    }, [text, phase]);

    return (
        <h1 className="text-5xl md:text-7xl font-display font-medium leading-[0.9] text-white tracking-tight">
            <span className="whitespace-nowrap">
                <span className="relative inline-block">
                    <span
                        className={`transition-all duration-1000 ${phase === 'finished'
                                ? 'text-gradient font-bold drop-shadow-[0_0_30px_rgba(245,158,11,0.6)]'
                                : 'text-white'
                            }`}
                    >
                        {text}
                    </span>
                    {/* Animated Cursor */}
                    <span
                        className={`
              absolute -right-[0.15em] top-[0.1em] bottom-[0.1em] w-[0.08em] bg-yellow-500
              transition-opacity duration-100
              ${(!cursorVisible || phase === 'finished') ? 'opacity-0' : 'opacity-100'}
            `}
                    />
                </span>
                <span className="text-white"> Auctions</span>
            </span>
            <br />
            <span className="text-white">On-Chain</span>
        </h1>
    );
};
