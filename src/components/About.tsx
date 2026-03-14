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
                    Engineering <span className="text-secondary">Philosophy</span>
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
                        I specialize in architecting systems where **reliability meets intelligence**. 
                        My approach is rooted in clean architecture, type safety, and a data-first mindset. 
                        Whether it&apos;s optimizing telemetry ingestion for global security networks or 
                        designing deterministic AI agents, I focus on building software that is 
                        maintainable, performant, and scales alongside business growth.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
