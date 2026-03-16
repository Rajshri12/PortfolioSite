"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

interface MagneticProps {
    children: React.ReactElement;
    amount?: number;
}

export default function Magnetic({ children, amount = 0.5 }: MagneticProps) {
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const springConfig = { stiffness: 150, damping: 15, mass: 0.1 };
    const smoothX = useSpring(x, springConfig);
    const smoothY = useSpring(y, springConfig);

    const handleMouseMove = (e: React.MouseEvent) => {
        const { clientX, clientY } = e;
        const { height, width, left, top } = ref.current!.getBoundingClientRect();
        const middleX = clientX - (left + width / 2);
        const middleY = clientY - (top + height / 2);
        x.set(middleX * amount);
        y.set(middleY * amount);
    };

    const reset = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={reset}
            style={{ x: smoothX, y: smoothY }}
        >
            {children}
        </motion.div>
    );
}
