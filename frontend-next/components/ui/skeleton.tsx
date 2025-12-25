import * as React from "react";
import { cn } from "@/lib/utils";

const Skeleton = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <div
            className={cn("animate-shimmer rounded-md bg-dark-700/50", className)}
            style={{
                backgroundImage:
                    "linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.1), transparent)",
                backgroundSize: "200% 100%",
            }}
            {...props}
        />
    );
};

export { Skeleton };
