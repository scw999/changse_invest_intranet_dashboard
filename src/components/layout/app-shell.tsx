"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  BookOpenText,
  ChartCandlestick,
  LayoutDashboard,
  ListTree,
  Newspaper,
  WalletCards,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "투데이", icon: LayoutDashboard },
  { href: "/archive", label: "아카이브", icon: Archive },
  { href: "/themes", label: "테마", icon: BookOpenText },
  { href: "/tickers", label: "티커", icon: ChartCandlestick },
  { href: "/follow-up", label: "팔로업", icon: ListTree },
  { href: "/admin", label: "뉴스 운영", icon: Newspaper },
  { href: "/portfolio", label: "포트폴리오", icon: WalletCards },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen max-w-[1700px] gap-4 px-3 py-3 md:gap-6 md:px-6 md:py-6">
      <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[290px] shrink-0 flex-col rounded-[34px] border border-[var(--border-soft)] bg-[rgba(15,27,45,0.94)] p-6 text-white shadow-[0_32px_90px_rgba(7,17,31,0.28)] lg:flex">
        <div>
          <p className="text-xs font-semibold tracking-[0.24em] text-white/55">
            창세인베스트
          </p>
          <h1 className="mt-3 font-[family:var(--font-display)] text-3xl leading-tight">
            창세인베스트 인트라 시스템
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/72">
            시장 뉴스, 전망 기록, 후속 검증, 포트폴리오 맥락을 한 화면에서 다루는 개인 리서치 운영 대시보드입니다.
          </p>
        </div>

        <nav className="mt-10 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  isActive
                    ? "bg-[rgba(255,255,255,0.14)] text-white"
                    : "text-white/70 hover:bg-[rgba(255,255,255,0.08)] hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-[26px] border border-white/10 bg-[rgba(255,255,255,0.06)] p-5">
          <p className="text-xs font-semibold tracking-[0.18em] text-white/55 uppercase">
            일일 스캔 슬롯
          </p>
          <div className="mt-4 flex gap-2">
            {["09", "13", "18", "22"].map((slot) => (
              <div
                key={slot}
                className="flex-1 rounded-2xl border border-white/8 bg-white/5 px-3 py-3 text-center"
              >
                <p className="text-lg font-semibold">{slot}</p>
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">KST</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-[rgba(200,157,97,0.25)] bg-[rgba(200,157,97,0.08)] p-4 text-sm leading-6 text-white/78">
            현재는 시드 데이터와 브라우저 저장 기반 MVP입니다. 다음 단계에서 같은 구조를 Supabase CRUD로 자연스럽게 연결할 수 있습니다.
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col pb-[calc(6.75rem+env(safe-area-inset-bottom))] lg:pb-0">
        <header className="mb-4 flex items-center justify-between rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.65)] px-4 py-3 shadow-[0_18px_45px_rgba(16,29,46,0.05)] backdrop-blur-sm lg:hidden">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--text-faint)]">
              창세인베스트
            </p>
            <p className="font-[family:var(--font-display)] text-lg leading-tight text-[var(--text-strong)]">
              창세인베스트 인트라 시스템
            </p>
          </div>
          <div className="rounded-full bg-[rgba(23,42,70,0.08)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-[var(--text-muted)]">
            1단계
          </div>
        </header>

        <main className="flex-1 space-y-6">{children}</main>
      </div>

      <nav className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 rounded-[22px] border border-[rgba(16,29,46,0.1)] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_22px_70px_rgba(16,29,46,0.18)] backdrop-blur-lg lg:hidden">
        <div className="flex gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-[72px] flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold tracking-[0.08em] transition",
                  isActive
                    ? "bg-[rgba(23,42,70,0.1)] text-[var(--text-strong)]"
                    : "text-[var(--text-faint)]",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
