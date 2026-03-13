import type { Metadata } from "next";
import { Newsreader, Noto_Sans_KR } from "next/font/google";

import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "창세인베스트 인트라 시스템",
  description:
    "경제 뉴스, 시장 해석, 투자 아이디어, 팔로업 결과와 포트폴리오 연관성을 구조적으로 관리하는 개인 리서치 대시보드입니다.",
  icons: {
    icon: "/favicon-source.png",
    shortcut: "/favicon-source.png",
    apple: "/favicon-source.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${notoSansKr.variable} ${newsreader.variable}`}>
        {children}
      </body>
    </html>
  );
}
