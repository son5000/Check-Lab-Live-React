"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { useDisplaySettings } from "./layouts/hooks/use-display-settings";
import { useLanguageTranslator } from "./layouts/hooks/use-language-translator";
import { PwaRegistration } from "./pwa-registration";
export function Providers({ children }) {
    const { settings } = useDisplaySettings();
    useLanguageTranslator(settings.language);
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                refetchOnWindowFocus: false,
                retry: 1,
                staleTime: 5000,
            },
        },
    }));
    return (<QueryClientProvider client={queryClient}>
      {children}
      <PwaRegistration />
      <Toaster position="top-right" toastOptions={{ duration: 4000 }}/>
    </QueryClientProvider>);
}
