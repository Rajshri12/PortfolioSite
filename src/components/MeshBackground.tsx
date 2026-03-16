"use client";

import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

export default function MeshBackground() {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const smoothMouseX = useSpring(mouseX, { damping: 50, stiffness: 400 });
    const smoothMouseY = useSpring(mouseY, { damping: 50, stiffness: 400 });

    const { scrollYProgress } = useScroll();

    // Parallax and rotation effects based on scroll
    const rotate = useTransform(scrollYProgress, [0, 1], [0, 90]);
    const scale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set((e.clientX / window.innerWidth - 0.5) * 20);
            mouseY.set((e.clientY / window.innerHeight - 0.5) * 20);
        };
        window.addEventListener("mousemove", handleMouseMove, { passive: true });
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX, mouseY]);

    return (
        <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-background">
            <motion.div
                style={{
                    rotate,
                    scale,
                    x: smoothMouseX,
                    y: smoothMouseY,
                }}
                className="absolute inset-[-10%] opacity-40 dark:opacity-20 transition-transform duration-1000 ease-out will-change-transform"
            >
                {/* Large Lavender Blob */}
                <motion.div
                    animate={{
                        x: [0, 100, 0],
                        y: [0, 50, 0],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="absolute top-[10%] left-[20%] w-[50%] h-[50%] rounded-full bg-primary/40 blur-[120px] will-change-transform"
                />

                {/* Champagne Gold Blob */}
                <motion.div
                    animate={{
                        x: [0, -80, 0],
                        y: [0, 100, 0],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="absolute bottom-[20%] right-[10%] w-[45%] h-[45%] rounded-full bg-accent/30 blur-[140px] will-change-transform"
                />

                {/* Pale Lilac/Secondary Blob */}
                <motion.div
                    animate={{
                        x: [0, 60, 0],
                        y: [0, -120, 0],
                        scale: [1, 1.3, 1],
                    }}
                    transition={{
                        duration: 18,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="absolute top-[40%] right-[20%] w-[40%] h-[40%] rounded-full bg-secondary/30 blur-[100px] will-change-transform"
                />
            </motion.div>

            {/* Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>
    );
}
