import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";

// Fonts
const fontSans = Inter({
    subsets: ["latin"],
    variable: "--font-sans",
    display: "swap",
});

const fontMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
    display: "swap",
});

// Metadata
export const metadata: Metadata = {
    title: {
        default: "Hub",
        template: "%s | Hub",
    },
    description: "Personal Hub - Study/Code/ChatLog/Ideas unified",
    keywords: ["hub", "personal", "study", "code", "notes", "ideas"],
    authors: [{ name: "Hub" }],
    creator: "Hub",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "Hub",
        startupImage: [
            {
                url: "/icons/apple-splash-2048-2732.png",
                media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
            },
            {
                url: "/icons/apple-splash-1668-2388.png",
                media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
            },
            {
                url: "/icons/apple-splash-1536-2048.png",
                media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
            },
            {
                url: "/icons/apple-splash-1125-2436.png",
                media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
            },
            {
                url: "/icons/apple-splash-1242-2688.png",
                media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
            },
        ],
    },
    icons: {
        icon: [
            { url: "/favicon.ico" },
            {
                url: "/icons/icon-192x192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                url: "/icons/icon-512x512.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
        apple: [
            {
                url: "/icons/apple-touch-icon.png",
                sizes: "180x180",
                type: "image/png",
            },
        ],
    },
    other: {
        "mobile-web-app-capable": "yes",
    },
};

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "white" },
        { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
    ],
    width: "device-width",
    initialScale: 1,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="zh-CN" suppressHydrationWarning>
            <head>
                {/* PWA theme color for address bar */}
                <meta name="theme-color" content="#0c0a09" />
                {/* Microsoft Tile */}
                <meta name="msapplication-TileColor" content="#0c0a09" />
                <meta
                    name="msapplication-config"
                    content="/browserconfig.xml"
                />
                {/* Prevent FOUC for theme */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    var theme = localStorage.getItem('hub-theme');
                                    var resolved = theme;
                                    if (!theme || theme === 'system') {
                                        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                                    }
                                    document.documentElement.classList.add(resolved);
                                } catch (e) {
                                    document.documentElement.classList.add('dark');
                                }
                            })();
                        `,
                    }}
                />
            </head>
            <body
                className={`${fontSans.variable} ${fontMono.variable} font-sans min-h-screen bg-background antialiased`}
            >
                <ThemeProvider defaultTheme="system" storageKey="hub-theme">
                    <ToastProvider position="bottom-right">
                        <AuthProvider>
                            {/* Main App Shell */}
                            <div className="relative flex min-h-screen flex-col">
                                {children}
                            </div>
                        </AuthProvider>
                    </ToastProvider>
                </ThemeProvider>

                {/* Service Worker Registration Script */}
                <Script
                    id="sw-register"
                    strategy="afterInteractive"
                    dangerouslySetInnerHTML={{
                        __html: `
                            if ('serviceWorker' in navigator) {
                                window.addEventListener('load', function() {
                                    navigator.serviceWorker.register('/sw.js', { scope: '/' })
                                        .then(function(registration) {
                                            console.log('[PWA] Service Worker registered:', registration.scope);
                                        })
                                        .catch(function(error) {
                                            console.log('[PWA] Service Worker registration failed:', error);
                                        });
                                });
                            }
                        `,
                    }}
                />
            </body>
        </html>
    );
}
