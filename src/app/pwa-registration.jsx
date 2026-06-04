"use client";

import { useEffect } from "react";

export function PwaRegistration() {
    useEffect(() => {
        if (process.env.NODE_ENV !== "production") {
            return undefined;
        }

        if (!("serviceWorker" in navigator)) {
            return undefined;
        }

        let cancelled = false;

        const registerServiceWorker = async () => {
            try {
                await navigator.serviceWorker.register("/sw.js", { scope: "/" });
            } catch (error) {
                if (!cancelled) {
                    console.warn("CheckLabLive service worker registration failed.", error);
                }
            }
        };

        if (document.readyState === "complete") {
            registerServiceWorker();
            return () => {
                cancelled = true;
            };
        }

        window.addEventListener("load", registerServiceWorker);

        return () => {
            cancelled = true;
            window.removeEventListener("load", registerServiceWorker);
        };
    }, []);

    return null;
}
