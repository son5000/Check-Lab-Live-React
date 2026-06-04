export default function manifest() {
    return {
        id: "/",
        name: "CheckLabLive",
        short_name: "CheckLab",
        description: "Realtime lab monitoring dashboard",
        lang: "ko",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#071116",
        theme_color: "#08111f",
        prefer_related_applications: false,
        categories: ["business", "productivity", "utilities"],
        icons: [
            {
                src: "/icons/checklab-icon-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/checklab-icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/checklab-maskable-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],
        shortcuts: [
            {
                name: "Monitoring",
                short_name: "Monitor",
                description: "Open realtime monitoring",
                url: "/monitoring",
                icons: [
                    {
                        src: "/icons/checklab-icon-192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                ],
            },
        ],
    };
}
