import type { Metadata } from "next";
import { connection } from "next/server";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { SessionNotice } from "@/components/layout/SessionNotice";
import { AuthProvider } from "@/context/AuthContext";
import { BRAND, SITE_DESCRIPTION, siteSettings } from "@/lib/seo";
import "./globals.css";

export function generateMetadata(): Metadata {
  const { origin, indexing } = siteSettings();
  return {
    metadataBase: new URL(origin),
    applicationName: BRAND,
    title: { default: BRAND, template: `%s | ${BRAND}` },
    description: SITE_DESCRIPTION,
    robots: { index: indexing, follow: true },
  };
}

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
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-lg focus:bg-white focus:p-4 focus:text-blue-700 focus:outline-2"
            >
              Skip to main content
            </a>
            <Navbar />
            <SessionNotice />
            <main
              id="main-content"
              tabIndex={-1}
              className="min-w-0 flex-1 scroll-mt-40"
            >
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
