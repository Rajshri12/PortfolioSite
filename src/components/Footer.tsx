"use client";

import { Mail, MapPin, Phone, Github, Linkedin } from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-background border-t border-primary/10 py-12 relative z-10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">

                    <div className="text-center md:text-left">
                        <h3 className="text-2xl font-bold text-foreground mb-2">Raj Shri <span className="text-primary">Guru</span></h3>
                        <p className="text-foreground/60 max-w-sm">
                            Backend Engineer & AI System Designer building scalable, intelligent solutions.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 md:gap-8 items-center">
                        <a href="mailto:rajshreeguru0@gmail.com" className="flex items-center gap-2 text-foreground/80 hover:text-primary transition-colors">
                            <Mail className="w-5 h-5" />
                            <span>rajshreeguru0@gmail.com</span>
                        </a>

                        <div className="flex items-center gap-2 text-foreground/80">
                            <Phone className="w-5 h-5 text-secondary" />
                            <span>+91 7781093999</span>
                        </div>

                        <div className="flex items-center gap-2 text-foreground/80">
                            <MapPin className="w-5 h-5 text-accent" />
                            <span>Bengaluru, Karnataka</span>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-primary/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-foreground/50 text-sm">
                        © {new Date().getFullYear()} Raj Shri Guru. All rights reserved.
                    </p>

                    <div className="flex gap-4">
                        <a href="#" className="p-2 bg-primary/5 rounded-full hover:bg-primary/10 text-foreground transition-colors" aria-label="LinkedIn">
                            <Linkedin className="w-5 h-5" />
                        </a>
                        <a href="#" className="p-2 bg-primary/5 rounded-full hover:bg-primary/10 text-foreground transition-colors" aria-label="GitHub">
                            <Github className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
