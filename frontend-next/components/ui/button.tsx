import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                primary:
                    "bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 shadow-lg shadow-primary-500/50",
                secondary:
                    "bg-dark-800 text-slate-50 hover:bg-dark-700 border border-dark-700",
                ghost: "hover:bg-dark-800 hover:text-slate-50",
                outline:
                    "border border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white",
                destructive:
                    "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/50",
            },
            size: {
                sm: "h-9 px-3 text-xs",
                md: "h-10 px-4 py-2",
                lg: "h-12 px-6 text-base",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "md",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
