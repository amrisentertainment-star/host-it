import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HOST IT!",
  description:
    "Interactive TikTok Live Game Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white overflow-x-hidden">

        {/* GLOBAL STARGRASS BACKGROUND */}
        <div className="fixed inset-0 -z-10">

          <div className="absolute inset-0 bg-black" />

          <div className="absolute top-0 left-0 w-[40rem] h-[40rem] bg-cyan-500/10 blur-[140px] rounded-full" />

          <div className="absolute bottom-0 right-0 w-[40rem] h-[40rem] bg-fuchsia-500/10 blur-[140px] rounded-full" />

          <div className="absolute top-1/2 left-1/2 w-[30rem] h-[30rem] bg-violet-500/10 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2" />

        </div>

        {children}
      </body>
    </html>
  );
}