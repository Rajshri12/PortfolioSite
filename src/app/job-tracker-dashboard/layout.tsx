import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./dashboard.css";
import Navigation from "@/components/job-tracker/Navigation";
import CompassBar from "@/components/job-tracker/CompassBar";
import ActivityTracker from "@/components/job-tracker/ActivityTracker";
import { TaskProvider } from "@/context/TaskContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Career Hub",
  description: "Your personal career growth & accountability space",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "Phoenix",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  viewportFit: "cover",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <TaskProvider>
      <ActivityTracker />
      <div className={`${inter.className} dashboard-root min-h-screen`}>
        <div className="flex min-h-screen flex-col md:flex-row">
          <Navigation />
          <main className="flex-1 overflow-y-auto">
            <CompassBar />
            {children}
          </main>
        </div>
      </div>
    </TaskProvider>
  );
}
