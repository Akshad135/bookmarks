import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png"],
            manifest: {
                name: "Bookmark Manager",
                short_name: "Bookmarks",
                description: "A sleek, modern bookmark manager to organize your web resources",
                id: "/",
                theme_color: "#f97316",
                background_color: "#09090b",
                display: "standalone",
                orientation: "portrait-primary",
                scope: "/",
                start_url: "/",
                prefer_related_applications: false,
                icons: [
                    {
                        src: "/favicon.svg",
                        sizes: "any",
                        type: "image/svg+xml",
                        purpose: "any",
                    },
                    {
                        src: "/icon-192.png",
                        sizes: "192x192",
                        type: "image/png",
                        purpose: "any",
                    },
                    {
                        src: "/icon-512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any",
                    },
                ],
                share_target: {
                    action: "/",
                    method: "GET",
                    params: {
                        title: "title",
                        text: "text",
                        url: "url",
                    },
                },
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: "CacheFirst",
                        options: {
                            cacheName: "google-fonts-cache",
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: "CacheFirst",
                        options: {
                            cacheName: "gstatic-fonts-cache",
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/www\.google\.com\/s2\/favicons.*/i,
                        handler: "CacheFirst",
                        options: {
                            cacheName: "favicon-cache",
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                ],
            },
        }),
    ],
    server: {
        proxy: {
            '/api': 'http://localhost:3000',
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
})
