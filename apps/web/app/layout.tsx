import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "羅朱組隊任務小工具",
  description: "為楓之谷Artale組隊任務羅密歐與茱麗葉設計的小工具",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
