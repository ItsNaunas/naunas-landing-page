import type { Metadata } from "next";
import "./globals.css";
import { CursorGlow } from "@/components/ui/CursorGlow";

export const metadata: Metadata = {
  title: "Naunas Systems — Client Lifecycle Infrastructure",
  description:
    "We install client lifecycle infrastructure, custom automations, and bespoke builds that turn chaotic lead flow into controlled revenue.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#0C0C0C] text-white">
        <CursorGlow />
        {children}
      </body>
    </html>
  );
}
