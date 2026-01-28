"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect } from "react";

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    // Handle veil theme class mapping
    useEffect(() => {
        const observer = new MutationObserver(() => {
            const html = document.documentElement;
            // If veil class is present, replace it with dark for styling
            if (html.classList.contains("veil")) {
                html.classList.remove("veil");
                html.classList.add("dark");
            }
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, []);

    return (
        <NextThemesProvider
            {...props}
            themes={["light", "dark", "veil"]}
        >
            {children}
        </NextThemesProvider>
    );
}
