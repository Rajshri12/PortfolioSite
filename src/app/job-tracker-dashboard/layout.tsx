import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./dashboard.css";
import Navigation from "@/components/job-tracker/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Daily Career Tracker",
  description: "Your daily companion for job hunting and productivity",
};

import { TaskProvider } from "@/context/TaskContext";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <TaskProvider>
      <div className={`${inter.className} dashboard-root min-h-screen`}>
        <div className="flex min-h-screen flex-col md:flex-row">
          <Navigation />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </TaskProvider>
  );
}
