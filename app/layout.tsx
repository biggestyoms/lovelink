import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LoveLink",
  description: "Just the two of you.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="noise">{children}</body>
    </html>
  );
}
