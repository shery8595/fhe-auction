"use client";

import { useEffect, useRef } from 'react';

export const MatrixRain = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        // Characters to use in the rain
        const characters = 'FHEAUCTION01';
        const fontSize = 14;
        const columns = Math.floor(width / fontSize);

        // Initialize drops at random Y positions
        const drops: number[] = [];
        for (let i = 0; i < columns; i++) {
            drops[i] = Math.random() * -100; // Start above screen
        }

        const draw = () => {
            // Trail effect: render a semi-transparent rect over the whole canvas
            ctx.fillStyle = 'rgba(0, 0, 0, 0.03)'; // Black background
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = '#f59e0b'; // Yellow text
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const text = characters.charAt(Math.floor(Math.random() * characters.length));
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };

        const interval = setInterval(draw, 50);

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener('resize', handleResize);

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none z-[-2] opacity-[0.25]"
        />
    );
};

export const ProgressiveBlur = () => {
    return (
        <div className="gradient-blur">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
        </div>
    );
};
