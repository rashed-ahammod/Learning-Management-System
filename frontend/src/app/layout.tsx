import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LMS — Learning Management System",
  description:
    "Courses, lessons, quizzes and progress tracking for students, instructors and content managers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-clip bg-slate-50 font-sans text-slate-900">
        <SiteHeader />
        {/* overflow-x-clip above exists for the landing page's full-bleed hero and
            CTA bands: they break out of this container with a negative-margin
            trick that briefly measures 100vw, which would otherwise force a
            horizontal scrollbar on every page, not just that one. */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
