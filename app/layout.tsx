import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/shell/Shell";
import { AppStateProvider } from "@/lib/store";
import { ToastProvider } from "@/components/feedback/Toast";
import { StoreProvider } from "@/components/providers/StoreProvider";
import { SyncStatusProvider } from "@/components/providers/SyncStatusProvider";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "نظام المبيعات",
  description: "نظام مبيعات ومخزون يعمل دون اتصال بالكامل على جهازك.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} h-full antialiased`}>
      <body className="min-h-full bg-[var(--bg)] text-[var(--text)] font-[var(--font)]">
        <AppStateProvider>
          <ToastProvider>
            <StoreProvider>
              <SyncStatusProvider>
                <Shell>{children}</Shell>
              </SyncStatusProvider>
            </StoreProvider>
          </ToastProvider>
        </AppStateProvider>
      </body>
    </html>
  );
}
