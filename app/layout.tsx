import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const mont = Montserrat({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mental Health Assistant",
  description: "Mental Health Assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={mont.className}>{children}</body>
    </html>
  );
}
