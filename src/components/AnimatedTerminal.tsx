"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Tilt from "react-parallax-tilt";

const terminalLogs = [
  "> Initializing Core Architecture...",
  "> Establishing DB Connections (PostgreSQL)...",
  "> Loading AI Inference Models (TensorFlow)...",
  "> Orchestrating Microservices (Docker)...",
  "> Running health checks: all services optimal.",
  "> Enabling High-Concurrency Mode.",
  "> Server active & listening on port 8080 🚀",
];

export default function AnimatedTerminal() {
  const [logs, setLogs] = useState<string[]>([]);
  const [logIndex, setLogIndex] = useState(0);

  useEffect(() => {
    if (logIndex < terminalLogs.length) {
      const timer = setTimeout(() => {
        setLogs((prev) => [...prev, terminalLogs[logIndex]]);
        setLogIndex(logIndex + 1);
      }, Math.random() * 600 + 300); // Random delay between 300ms and 900ms
      return () => clearTimeout(timer);
    } else {
        // Option to loop it
        const resetTimer = setTimeout(() => {
            setLogs([]);
            setLogIndex(0);
        }, 5000)
        return () => clearTimeout(resetTimer);
    }
  }, [logIndex]);

  return (
    <Tilt
      tiltMaxAngleX={10}
      tiltMaxAngleY={10}
      perspective={1000}
      scale={1.02}
      transitionSpeed={2500}
      gyroscope={true}
      className="w-full max-w-[500px]"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 150,
          damping: 12,
          delay: 0.2,
        }}
        // The playful shadow style reminiscent of Cassie Codes!
        className="w-full h-[350px] bg-[#1a1b26] rounded-2xl overflow-hidden border-2 border-primary/50 shadow-[8px_8px_0px_var(--primary)] text-[#a9b1d6] font-mono text-sm sm:text-base flex flex-col relative"
      >
        {/* Terminal Header */}
        <div className="bg-[#24283b] px-4 py-3 flex items-center gap-2 border-b border-primary/20">
          <div className="w-3 h-3 rounded-full bg-[#f7768e]"></div>
          <div className="w-3 h-3 rounded-full bg-[#e0af68]"></div>
          <div className="w-3 h-3 rounded-full bg-[#9ece6a]"></div>
          <p className="ml-4 text-xs text-[#565f89] font-semibold tracking-widest uppercase">
            backend_engineer.sh
          </p>
        </div>

        {/* Terminal Body */}
        <div className="p-6 flex-1 flex flex-col gap-2 overflow-y-auto">
          {logs.map((log, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={log.includes("🚀") ? "text-[#9ece6a] font-bold" : ""}
            >
              {log}
            </motion.div>
          ))}
          {/* Blinking Cursor */}
          <motion.div
            animate={{ opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="w-2 h-5 bg-[#7aa2f7] mt-1"
          />
        </div>

        {/* Playful Floating Badge inside the terminal container */}
         <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="absolute bottom-4 right-4 bg-[#7aa2f7] text-[#1a1b26] text-xs font-bold px-3 py-1 rounded-full shadow-lg border-2 border-[#1a1b26]"
         >
            System: Online
         </motion.div>
      </motion.div>
    </Tilt>
  );
}
