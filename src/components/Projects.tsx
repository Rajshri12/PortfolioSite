"use client";

import { motion } from "framer-motion";
import Tilt from "react-parallax-tilt";
import { ExternalLink, Github } from "lucide-react";

const projects = [
    {
        title: "Adaptive AI Learning Core",
        description: "Developed a distributed AI tutoring system that mirrors mentor-level evaluations with 90%+ accuracy. I engineered a dynamic skill graph engine to track student knowledge gaps and optimized LLM context management to handle long-running pedagogical conversations without performance degradation.",
        tech: ["Next.js 16", "TypeScript", "GPT-4o", "MongoDB", "Prisma", "Tailwind CSS"],
        links: { github: "#", live: "#" }
    },
    {
        title: "Frontdesk AI – Deterministic Booking Agent",
        description: "Built a production-grade telephony agent capable of handling complex reservation workflows. I designed a custom state machine to ensure zero AI drift during high-stakes bookings and integrated a 4-layer audit engine for regulatory traceability. Optimized for sub-second PSTN response latency.",
        tech: ["Python", "FastAPI", "OpenAI", "Twilio", "MongoDB", "ElevenLabs"],
        links: { github: "#", live: "#" }
    }
];

export default function Projects() {
    return (
        <section id="projects" className="py-24 bg-background relative z-10 overflow-hidden">
            {/* Decorative background grids */}
            <div className="absolute top-0 left-0 w-full h-full opacity-[0.05] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--color-primary) 1px, transparent 0)', backgroundSize: '40px 40px' }}
            />

            <div className="max-w-7xl mx-auto px-6">
                <motion.h2
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="text-4xl md:text-5xl font-bold mb-16 text-center"
                >
                    Featured <span className="text-primary">Projects</span>
                </motion.h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                    {projects.map((project, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.6, delay: index * 0.2 }}
                        >
                            <Tilt
                                tiltMaxAngleX={10}
                                tiltMaxAngleY={10}
                                perspective={1000}
                                transitionSpeed={1000}
                                scale={1.02}
                                gyroscope={true}
                                className="h-full"
                            >
                                <div className="glass p-8 rounded-3xl h-full flex flex-col relative group border border-primary/10 hover:border-primary/50 transition-colors duration-500 overflow-hidden">

                                    {/* Hover glow effect */}
                                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-3xl blur opacity-0 group-hover:opacity-20 transition duration-1000 z-0" />

                                    <div className="relative z-10 flex flex-col h-full">
                                        <h3 className="text-2xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors">
                                            {project.title}
                                        </h3>

                                        <p className="text-foreground/70 text-lg leading-relaxed flex-grow mb-8">
                                            {project.description}
                                        </p>

                                        <div className="flex flex-wrap gap-2 mb-8">
                                            {project.tech.map((tech, i) => (
                                                <span key={i} className="px-3 py-1 bg-primary/10 text-foreground/80 rounded-full text-sm font-medium border border-primary/20">
                                                    {tech}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-4 mt-auto">
                                            <a href={project.links.github} className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 hover:text-primary transition-colors" aria-label="GitHub">
                                                <Github className="w-5 h-5 text-foreground" />
                                            </a>
                                            <a href={project.links.live} className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 hover:text-primary transition-colors" aria-label="Live Demo">
                                                <ExternalLink className="w-5 h-5 text-foreground" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </Tilt>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
