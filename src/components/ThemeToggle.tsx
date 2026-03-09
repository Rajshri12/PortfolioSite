"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Magnetic from "./Magnetic";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    // Avoid hydration mismatch by waiting for mount
    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <Magnetic amount={0.3}>
            <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="fixed top-6 right-6 z-50 p-3 rounded-full glass hover:bg-primary/10 transition-colors duration-300 shadow-[0_0_15px_rgba(168,155,194,0.3)] group"
                aria-label="Toggle theme"
            >
                {theme === "dark" ? (
                    <Sun className="h-6 w-6 text-accent group-hover:rotate-45 transition-transform duration-500" />
                ) : (
                    <Moon className="h-6 w-6 text-foreground group-hover:-rotate-12 transition-transform duration-500" />
                )}
            </button>
        </Magnetic>
    );
}
