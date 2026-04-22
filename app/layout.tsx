import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Studio",
  description: "轻量 OpenAI 图像 Web UI —— 文生图、图片编辑、历史图库",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
        <ToastProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="ml-14 flex-1 min-w-0">{children}</main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
