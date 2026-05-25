import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthHydrator } from "@/components/providers/auth-hydrator";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BizzGrow HRMS",
  description:
    "Enterprise HRMS for attendance, tasks, leave, and admin control",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BizzGrow HRMS",
  },
};

export const viewport: Viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}
      suppressHydrationWarning
    >
      <body className="h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <AuthHydrator />
          {/* Mount client-side realtime provider */}
          <script suppressHydrationWarning={true} />
          {/* HrmsRealtimeMount will be client-only and attach listeners */}
          <div id="hrms-realtime-mount" />
          {children}
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
