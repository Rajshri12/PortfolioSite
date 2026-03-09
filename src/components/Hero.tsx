"use client";

import { motion } from "framer-motion";
import { Typewriter } from "react-simple-typewriter";
import { ArrowDown } from "lucide-react";
import Magnetic from "./Magnetic";

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden w-full">
            {/* Background gradients */}
            <div className="absolute inset-0 w-full h-full bg-background z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[120px]" />
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 border border-primary/20"
                >
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    <span className="text-sm text-foreground/80 font-medium">Available for new opportunities</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
                    whileInView={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    viewport={{ once: true }}
                    className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
                >
                    <span className="text-foreground">Raj Shri </span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                        Guru
                    </span>
                </motion.h1>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                    className="text-2xl md:text-4xl text-foreground/80 font-medium mb-8 h-12"
                >
                    I build{" "}
                    <span className="text-primary font-bold">
                        <Typewriter
                            words={[
                                "Scalable Backends",
                                "AI-Powered Systems",
                                "Intelligent Microservices",
                                "High-Performance APIs",
                            ]}
                            loop={true}
                            cursor
                            cursorStyle="_"
                            typeSpeed={70}
                            deleteSpeed={50}
                            delaySpeed={2000}
                        />
                    </span>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                    className="max-w-2xl text-foreground/60 text-lg md:text-xl mb-12"
                >
                    Backend engineer & AI system designer focused on high-performance infrastructure,
                    telemetry ingestion, and zero-drift LLM integrations. Based in Bengaluru.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
                    className="flex flex-col sm:flex-row gap-6 items-center"
                >
                    <Magnetic>
                        <a
                            href="mailto:rajshreeguru0@gmail.com"
                            className="px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-accent text-background font-bold text-lg hover:scale-105 transition-transform shadow-[0_0_20px_rgba(168,155,194,0.4)] block"
                        >
                            Contact Me
                        </a>
                    </Magnetic>
                    <Magnetic>
                        <a
                            href="#experience"
                            className="px-8 py-4 rounded-xl glass text-foreground font-semibold text-lg hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 block"
                        >
                            View Work <ArrowDown className="w-5 h-5" />
                        </a>
                    </Magnetic>
                </motion.div>
            </div>
        </section>
    );
}
