/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "rgb(var(--background))",
                foreground: "rgb(var(--foreground))",
                primary: {
                    DEFAULT: "#f59e0b",
                    50: "#fffbeb",
                    100: "#fef3c7",
                    200: "#fde68a",
                    300: "#fcd34d",
                    400: "#fbbf24",
                    500: "#f59e0b",
                    600: "#d97706",
                    700: "#b45309",
                    800: "#92400e",
                    900: "#78350f",
                },
                dark: {
                    DEFAULT: "#000000",
                    50: "#fafafa",
                    100: "#f5f5f5",
                    200: "#e5e5e5",
                    300: "#d4d4d4",
                    400: "#a3a3a3",
                    500: "#737373",
                    600: "#525252",
                    700: "#404040",
                    800: "#262626",
                    900: "#171717",
                },
            },
            fontFamily: {
                display: ["Playfair Display", "serif"],
                sans: ["system-ui", "sans-serif"],
            },
            animation: {
                "fade-in": "fadeIn 0.6s ease-in-out",
                "slide-up": "slideUp 0.6s ease-out",
                "slide-down": "slideDown 0.6s ease-out",
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                shimmer: "shimmer 2s linear infinite",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { transform: "translateY(20px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
                slideDown: {
                    "0%": { transform: "translateY(-20px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
                shimmer: {
                    "0%": { backgroundPosition: "-1000px 0" },
                    "100%": { backgroundPosition: "1000px 0" },
                },
            },
            backdropBlur: {
                xs: "2px",
            },
        },
    },
    plugins: [],
};
