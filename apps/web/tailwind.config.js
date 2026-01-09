/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: "class",
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            borderColor: {
                border: "hsl(var(--border))",
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                // Hub 品牌色
                hub: {
                    50: "#f0f9ff",
                    100: "#e0f2fe",
                    200: "#bae6fd",
                    300: "#7dd3fc",
                    400: "#38bdf8",
                    500: "#0ea5e9",
                    600: "#0284c7",
                    700: "#0369a1",
                    800: "#075985",
                    900: "#0c4a6e",
                    950: "#082f49",
                },
                // 视图专用色
                study: {
                    DEFAULT: "#8b5cf6",
                    light: "#a78bfa",
                    dark: "#7c3aed",
                },
                code: {
                    DEFAULT: "#10b981",
                    light: "#34d399",
                    dark: "#059669",
                },
                chat: {
                    DEFAULT: "#f59e0b",
                    light: "#fbbf24",
                    dark: "#d97706",
                },
                ideas: {
                    DEFAULT: "#ec4899",
                    light: "#f472b6",
                    dark: "#db2777",
                },
            },
            fontFamily: {
                sans: ["var(--font-sans)", "system-ui", "sans-serif"],
                mono: ["var(--font-mono)", "Menlo", "Monaco", "monospace"],
            },
            fontSize: {
                "2xs": ["0.625rem", { lineHeight: "0.75rem" }],
            },
            spacing: {
                18: "4.5rem",
                88: "22rem",
                128: "32rem",
            },
            borderRadius: {
                "4xl": "2rem",
            },
            animation: {
                "fade-in": "fadeIn 0.3s ease-out",
                "slide-up": "slideUp 0.3s ease-out",
                "slide-down": "slideDown 0.3s ease-out",
                "pulse-soft": "pulseSoft 2s infinite",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { opacity: "0", transform: "translateY(10px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                slideDown: {
                    "0%": { opacity: "0", transform: "translateY(-10px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                pulseSoft: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.7" },
                },
            },
            boxShadow: {
                soft: "0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)",
                "soft-lg":
                    "0 10px 40px -10px rgba(0, 0, 0, 0.1), 0 2px 10px -2px rgba(0, 0, 0, 0.04)",
            },
            typography: (theme) => ({
                DEFAULT: {
                    css: {
                        maxWidth: "none",
                        color: theme("colors.gray.700"),
                        a: {
                            color: theme("colors.hub.600"),
                            "&:hover": {
                                color: theme("colors.hub.700"),
                            },
                        },
                        code: {
                            backgroundColor: theme("colors.gray.100"),
                            padding: "0.25rem 0.375rem",
                            borderRadius: "0.25rem",
                            fontWeight: "400",
                        },
                        "code::before": { content: '""' },
                        "code::after": { content: '""' },
                    },
                },
                dark: {
                    css: {
                        color: theme("colors.gray.300"),
                        a: {
                            color: theme("colors.hub.400"),
                            "&:hover": {
                                color: theme("colors.hub.300"),
                            },
                        },
                        code: {
                            backgroundColor: theme("colors.gray.800"),
                        },
                    },
                },
            }),
        },
    },
    plugins: [
        // 可选插件，需要时取消注释并安装
        // require('@tailwindcss/typography'),
        // require('@tailwindcss/forms'),
    ],
};
