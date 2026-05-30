import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Veerox AI — Admin",
  description: "Admin dashboard for Veerox AI voice + WhatsApp agent",
};

/**
 * Root layout: html/body + global providers only. The sidebar shell lives in
 * the (dashboard) route group so the (auth) login page can opt out of it.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-700 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
