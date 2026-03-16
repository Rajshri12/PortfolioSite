"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";

export default function CustomCursor() {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        const updateMousePosition = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (
                target.tagName.toLowerCase() === "a" ||
                target.tagName.toLowerCase() === "button" ||
                target.closest("a") ||
                target.closest("button")
            ) {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };

        window.addEventListener("mousemove", updateMousePosition, { passive: true });
        window.addEventListener("mouseover", handleMouseOver, { passive: true });

        return () => {
            window.removeEventListener("mousemove", updateMousePosition);
            window.removeEventListener("mouseover", handleMouseOver);
        };
    }, []);

    const springConfig = { damping: 25, stiffness: 200, mass: 0.5 };
    const cursorX = useSpring(mouseX, springConfig);
    const cursorY = useSpring(mouseY, springConfig);

    return (
        <>
            <motion.div
                className="fixed top-0 left-0 w-8 h-8 rounded-full border-2 border-primary pointer-events-none z-[9999] mix-blend-difference hidden md:block"
                style={{
                    x: cursorX,
                    y: cursorY,
                    translateX: "-50%",
                    translateY: "-50%",
                }}
                animate={{
                    scale: isHovering ? 1.5 : 1,
                    backgroundColor: isHovering ? "rgba(6, 182, 212, 0.2)" : "transparent",
                }}
                transition={{ duration: 0.15 }}
            />
            <motion.div
                className="fixed top-0 left-0 w-2 h-2 rounded-full bg-secondary pointer-events-none z-[10000] hidden md:block"
                style={{
                    x: mouseX,
                    y: mouseY,
                    translateX: "-50%",
                    translateY: "-50%",
                }}
            />
        </>
    );
}
