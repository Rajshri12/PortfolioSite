import CustomCursor from "@/components/CustomCursor";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Experience from "@/components/Experience";
import Projects from "@/components/Projects";
import SkillsEducation from "@/components/SkillsEducation";
import Footer from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import MeshBackground from "@/components/MeshBackground";

export default function Home() {
  return (
    <main className="relative bg-background min-h-screen selection:bg-primary/30">
      <MeshBackground />
      <CustomCursor />
      <ThemeToggle />
      <Hero />
      <About />
      <Experience />
      <Projects />
      <SkillsEducation />
      <Footer />
    </main>
  );
}
