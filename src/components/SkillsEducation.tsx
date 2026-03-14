"use client";

import { motion } from "framer-motion";
import { Server, Database, Code2, GraduationCap, Award, MousePointer2, Layers } from "lucide-react";
import { useState, useEffect } from "react";

export default function SkillsEducation() {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const cards = document.querySelectorAll('.glass') as NodeListOf<HTMLElement>;
            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                card.style.setProperty('--mouseX', `${x}px`);
                card.style.setProperty('--mouseY', `${y}px`);
            });
        };

        document.addEventListener('mousemove', handleMouseMove);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    const bentoItems = [
        {
            type: "skills",
            title: "Backend & Systems",
            icon: <Server className="w-6 h-6 text-primary" />,
            content: ["Spring Boot", "FastAPI", "REST APIs", "Microservices", "Docker", "CI/CD", "Databricks"],
            className: "md:col-span-2 md:row-span-1",
        },
        {
            type: "skills",
            title: "Languages",
            icon: <Code2 className="w-6 h-6 text-secondary" />,
            content: ["Java", "Python", "TypeScript"],
            className: "md:col-span-1 md:row-span-1",
        },
        {
            type: "cert",
            title: "Generative AI",
            provider: "Google Cloud",
            icon: <Award className="w-6 h-6 text-accent" />,
            description: "Foundational LLM concepts & prompt engineering.",
            className: "md:col-span-1 md:row-span-2",
        },
        {
            type: "education",
            title: "B.E. Electronics",
            institution: "Dayananda Sagar College",
            score: "9.40 CGPA",
            year: "2023",
            icon: <GraduationCap className="w-6 h-6 text-foreground" />,
            className: "md:col-span-2 md:row-span-1",
        },
        {
            type: "skills",
            title: "Databases & Tools",
            icon: <Database className="w-6 h-6 text-primary" />,
            content: ["MongoDB", "PostgreSQL"],
            className: "md:col-span-1 md:row-span-1",
        },
        {
            type: "skills",
            title: "Portfolio Stack",
            icon: <Layers className="w-6 h-6 text-accent" />,
            content: ["Next.js", "Tailwind CSS", "Framer Motion"],
            className: "md:col-span-1 md:row-span-1",
        },
    ];

    return (
        <section id="skills" className="py-24 bg-background relative z-10 border-t border-primary/10">
            <div className="max-w-7xl mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
                    whileInView={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    viewport={{ once: true, margin: "-100px" }}
                    className="text-4xl md:text-5xl font-bold mb-16 text-foreground text-center"
                >
                    Specialization <span className="text-primary">&</span> Background
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[220px]">
                    {bentoItems.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            className={`glass p-8 rounded-[2rem] relative overflow-hidden group cursor-default flex flex-col justify-between ${item.className}`}
                        >
                            {/* Active Glow Effect */}
                            <div
                                className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                                style={{
                                    background: `radial-gradient(circle at var(--mouseX) var(--mouseY), rgba(168, 155, 194, 0.15), transparent 80%)`
                                }}
                            />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-foreground/5 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                                        {item.icon}
                                    </div>
                                    {item.type === "skills" && <MousePointer2 className="w-4 h-4 text-foreground/20" />}
                                </div>

                                <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                                    {item.title}
                                </h3>

                                {item.type === "skills" && (
                                    <div className="flex flex-wrap gap-2">
                                        {item.content?.map((skill, i) => (
                                            <span key={i} className="text-xs font-medium px-2 py-1 bg-primary/5 text-foreground/60 rounded-md border border-primary/5 group-hover:border-primary/20 transition-colors">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {item.type === "cert" && (
                                    <>
                                        <p className="text-primary font-semibold text-sm">{item.provider}</p>
                                        <p className="text-foreground/60 text-sm mt-2 leading-snug">{item.description}</p>
                                    </>
                                )}

                                {item.type === "education" && (
                                    <div className="flex flex-col">
                                        <p className="text-foreground/70 text-sm">{item.institution}</p>
                                        <div className="flex justify-between items-end mt-4">
                                            <span className="text-primary font-bold">{item.score}</span>
                                            <span className="text-foreground/40 text-xs">{item.year}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Decorative Corner Element */}
                            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-primary/5 rounded-tl-3xl group-hover:bg-primary/20 transition-colors duration-500" />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
