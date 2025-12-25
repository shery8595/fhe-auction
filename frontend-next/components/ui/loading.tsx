import * as React from "react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: "sm" | "md" | "lg";
}

const LoadingSpinner = ({ size = "md", className, ...props }: LoadingSpinnerProps) => {
    const sizeClasses = {
        sm: "h-4 w-4 border-2",
        md: "h-8 w-8 border-3",
        lg: "h-12 w-12 border-4",
    };

    return (
        <div
            className={cn(
                "inline-block animate-spin rounded-full border-solid border-primary-500 border-t-transparent",
                sizeClasses[size],
                className
            )}
            {...props}
        />
    );
};

const LoadingDots = ({ className }: React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <div className={cn("flex space-x-1", className)}>
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary-500 [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary-500 [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary-500"></div>
        </div>
    );
};

const LoadingPulse = ({ className }: React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <div className={cn("flex space-x-2", className)}>
            <div className="h-3 w-3 animate-pulse rounded-full bg-primary-500"></div>
            <div className="h-3 w-3 animate-pulse rounded-full bg-primary-500 [animation-delay:0.2s]"></div>
            <div className="h-3 w-3 animate-pulse rounded-full bg-primary-500 [animation-delay:0.4s]"></div>
        </div>
    );
};

export { LoadingSpinner, LoadingDots, LoadingPulse };
