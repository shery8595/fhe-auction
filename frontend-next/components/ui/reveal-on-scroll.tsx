"use client";

import { useEffect, useRef } from 'react';

interface RevealOnScrollProps {
    children: React.ReactNode;
    className?: string;
}

export const RevealOnScroll: React.FC<RevealOnScrollProps> = ({ children, className = "" }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("animate");
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) observer.unobserve(ref.current);
        };
    }, []);

    return (
        <div ref={ref} className={`animate-on-scroll ${className}`}>
            {children}
        </div>
    );
};
