import type { Metadata } from "next";
import { connection } from "next/server";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { SessionNotice } from "@/components/layout/SessionNotice";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Veteran FOB",
    template: "%s | Veteran FOB",
  },
  description:
    "Find veterans resources near you, including healthcare, benefits, education, housing, and more.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Per-response CSP nonces must be applied during request-time rendering.
  await connection();
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50">
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <SessionNotice />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
