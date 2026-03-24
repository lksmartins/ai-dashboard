import type { Metadata, Viewport } from "next";
import { Source_Code_Pro } from "next/font/google";
import { RegisterSW } from "@/components/register-sw";
import "./globals.css";

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "AI Dashboard",
  description: "AI-powered task management",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AI Dashboard",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${sourceCodePro.variable}`}>
      <body className="antialiased">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
