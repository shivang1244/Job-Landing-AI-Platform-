import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Landing Platform",
  description: "AI-assisted job discovery and ATS optimization dashboard"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
