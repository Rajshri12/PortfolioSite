"use client";

import { motion } from "framer-motion";

const experiences = [
    {
        role: "Software Engineering Intern",
        company: "Radware",
        period: "April 2025 – Present",
        achievements: [
            "Architecting backend services for real-time security analytics, processing high-volume telemetry with sub-millisecond latency.",
            "Engineered automated data ingestion pipelines for network security appliances, increasing observability across 100+ global nodes.",
            "Optimized Databricks clusters and query patterns, achieving a permanent 5% reduction in cloud infrastructure spend while increasing throughput.",
            "Developed automated log transformation microservices using Python/FastAPI, eliminating manual intervention in 80% of security triage workflows.",
        ],
    },
    {
        role: "Apprentice Software Engineer",
        company: "Fidelity Investments",
        period: "Oct 2023 – Oct 2024",
        achievements: [
            "Orchestrated the migration of mission-critical fintech applications from Java 8 to Java 17, reducing startup times by 20% and improving memory efficiency.",
            "Implemented circuit breaker patterns and enhanced error handling across distributed microservices, resulting in a measurable increase in system uptime.",
            "Led incident triage and root cause analysis for production outages, maintaining a 99.9% service availability during scheduled on-call rotations.",
            "Enforced enterprise-grade CI/CD and code quality standards, reducing production-level bugs by approximately 15% through rigorous automated testing.",
        ],
    },
];

export default function Experience() {
    return (
        <section id="experience" className="py-24 bg-background relative z-10">
            <div className="max-w-7xl mx-auto px-6">
                <motion.h2
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="text-4xl md:text-5xl font-bold mb-16 text-center"
                >
                    Professional <span className="text-primary">Experience</span>
                </motion.h2>

                <div className="relative border-l-2 border-primary/30 ml-4 md:ml-12 pl-8 md:pl-16 space-y-16">
                    {experiences.map((exp, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="relative"
                        >
                            {/* Timeline dot */}
                            <div className="absolute -left-[41px] md:-left-[73px] top-1 w-6 h-6 rounded-full bg-background border-4 border-primary shadow-[0_0_15px_rgba(168,155,194,0.5)] z-10" />

                            <div className="glass p-8 rounded-2xl border border-primary/10 hover:border-primary/50 transition-colors duration-300">
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
                                    <div>
                                        <h3 className="text-2xl font-bold text-foreground">{exp.role}</h3>
                                        <h4 className="text-xl text-secondary font-medium">{exp.company}</h4>
                                    </div>
                                    <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 whitespace-nowrap">
                                        {exp.period}
                                    </span>
                                </div>

                                <ul className="list-disc list-inside space-y-3 mt-6 text-foreground/75 text-lg">
                                    {exp.achievements.map((item, i) => (
                                        <li key={i} className="leading-relaxed pl-2">
                                            <span className="-ml-2">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
