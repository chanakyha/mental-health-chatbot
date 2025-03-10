import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";

// Dynamically import the layout provider with no SSR
const LayoutProviderClient = dynamic(
  () => import("@/components/LayoutProvider"),
  {
    ssr: false,
  }
);

const mont = Montserrat({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mental Health Assistant",
  description:
    "Mental Health Assistant - A professional AI chatbot to support your mental wellbeing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${mont.className} bg-gray-50`}>
        <LayoutProviderClient>{children}</LayoutProviderClient>
      </body>
    </html>
  );
}
