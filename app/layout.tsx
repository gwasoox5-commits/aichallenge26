import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "제조업 전략 경영 시뮬레이션",
  description:
    "HRD 교육용 제조업 전략 의사결정 4라운드 시뮬레이션",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
