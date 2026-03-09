"use client";

import { motion } from "framer-motion";

export default function About() {
    return (
        <section id="about" className="py-24 bg-background relative z-10">
            <div className="max-w-7xl mx-auto px-6">
                <motion.h2
                    initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
                    whileInView={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    viewport={{ once: true, margin: "-100px" }}
                    className="text-4xl md:text-5xl font-bold mb-12 text-foreground"
                >
                    Career <span className="text-secondary">Objective</span>
                </motion.h2>
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                    className="glass p-8 md:p-12 rounded-3xl relative overflow-hidden"
                >
                    {/* Decorative glow */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-[80px]" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/20 rounded-full blur-[80px]" />

                    <p className="text-lg md:text-xl text-foreground/80 leading-relaxed max-w-4xl relative z-10">
                        I am a backend engineering and AI system design specialist, driven by the challenge of
                        building scalable, high-performance, and intelligent systems. I thrive in progressive
                        organizations where I can utilize my expertise to continuously enhance technical
                        capabilities while contributing to mission-critical workflows. From migrating legacy
                        monoliths to architecting zero-drift LLM agents, I focus on delivering robust and
                        future-proof software solutions.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
