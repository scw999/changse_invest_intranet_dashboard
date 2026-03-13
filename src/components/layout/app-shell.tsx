"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  Bell,
  BookOpenText,
  ChartCandlestick,
  LayoutDashboard,
  ListTree,
  Newspaper,
  WalletCards,
} from "lucide-react";

import { ViewerProvider } from "@/components/auth/viewer-context";
import { ResearchBootstrap } from "@/components/layout/research-bootstrap";
import { SyncStatusBanner } from "@/components/layout/sync-status-banner";
import type { AppViewer } from "@/lib/auth/session";
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

export function AppShell({
  children,
  viewer,
}: {
  children: React.ReactNode;
  viewer: AppViewer;
}) {
  const pathname = usePathname();
  const visibleNavItems = viewer.isAdmin
    ? navItems
    : navItems.filter((item) => item.href !== "/admin");

  return (
    <ViewerProvider viewer={viewer}>
      <div className="mx-auto flex min-h-screen max-w-[1700px] gap-4 px-3 py-3 md:gap-6 md:px-6 md:py-6">
        <ResearchBootstrap />

        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[290px] shrink-0 flex-col rounded-[34px] border border-[var(--border-soft)] bg-[rgba(15,27,45,0.94)] p-6 text-white shadow-[0_32px_90px_rgba(7,17,31,0.28)] lg:flex">
          <div>
            <div className="rounded-[28px] border border-white/12 bg-white/95 p-4 shadow-[0_18px_50px_rgba(7,17,31,0.14)]">
              <Image
                src="/changse-logo.png"
                alt="창세인베스트 로고"
                width={220}
                height={220}
                className="h-auto w-[180px]"
                priority
              />
            </div>
            <p className="mt-5 text-xs font-semibold tracking-[0.24em] text-white/55">CHANGSE INVEST</p>
            <h1 className="mt-3 font-[family:var(--font-display)] text-3xl leading-tight">
              창세인베스트 인트라 시스템
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/72">
              경제 뉴스, 시장 해석, 투자 아이디어와 팔로업 결과를 한 화면에서 운영하는 프라이빗
              리서치 대시보드입니다.
            </p>
          </div>

          <nav className="mt-10 space-y-2">
            {visibleNavItems.map((item) => {
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
            <div className="mb-4 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.05)] p-4">
              <p className="text-xs font-semibold tracking-[0.18em] text-white/55 uppercase">
                {viewer.isGuest ? "Guest Viewer" : "Private Viewer"}
              </p>
              <p className="mt-2 text-sm font-semibold text-white">{viewer.email}</p>
              {viewer.isGuest ? (
                <Link
                  href="/auth/sign-in"
                  className="mt-3 inline-flex rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/72 transition hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
                >
                  관리자 로그인
                </Link>
              ) : (
                <form action="/auth/sign-out" method="post" className="mt-3">
                  <button
                    type="submit"
                    className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/72 transition hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
                  >
                    로그아웃
                  </button>
                </form>
              )}
            </div>

            <p className="text-xs font-semibold tracking-[0.18em] text-white/55 uppercase">
              일일 업데이트 슬롯
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
              {viewer.isGuest
                ? "게스트는 리서치 내용을 읽기 전용으로 볼 수 있습니다. 입력과 수정은 관리자 또는 trusted assistant만 가능합니다."
                : "현재 앱은 서버 권한 확인 후 리서치 데이터를 불러오는 private MVP입니다. 입력과 수정은 trusted write 경로를 통해 안전하게 처리됩니다."}
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-4 text-sm text-white/74">
              <div className="flex items-center gap-2 font-semibold text-white/88">
                <Bell className="h-4 w-4" />
                데이터 상태
              </div>
              <div className="mt-3">
                <SyncStatusBanner />
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col pb-[calc(6.75rem+env(safe-area-inset-bottom))] lg:pb-0">
          <header className="mb-4 flex items-center justify-between rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.65)] px-4 py-3 shadow-[0_18px_45px_rgba(16,29,46,0.05)] backdrop-blur-sm lg:hidden">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-2xl bg-white px-2 py-1.5 shadow-[0_10px_24px_rgba(16,29,46,0.08)]">
                <Image
                  src="/changse-logo.png"
                  alt="창세인베스트 로고"
                  width={84}
                  height={84}
                  className="h-auto w-14"
                  priority
                />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--text-faint)]">
                  CHANGSE INVEST
                </p>
                <p className="font-[family:var(--font-display)] text-lg leading-tight text-[var(--text-strong)]">
                  창세인베스트 인트라 시스템
                </p>
              </div>
            </div>
            {viewer.isGuest ? (
              <Link
                href="/auth/sign-in"
                className="rounded-full bg-[rgba(23,42,70,0.08)] px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-[var(--text-muted)]"
              >
                관리자 로그인
              </Link>
            ) : (
              <form action="/auth/sign-out" method="post">
                <button className="rounded-full bg-[rgba(23,42,70,0.08)] px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-[var(--text-muted)]">
                  로그아웃
                </button>
              </form>
            )}
          </header>

          <main className="flex-1 space-y-4 md:space-y-6">
            <div className="lg:hidden">
              <SyncStatusBanner />
            </div>
            {children}
          </main>
        </div>

        <nav className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 rounded-[22px] border border-[rgba(16,29,46,0.1)] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_22px_70px_rgba(16,29,46,0.18)] backdrop-blur-lg lg:hidden">
          <div className="flex gap-1 overflow-x-auto">
            {visibleNavItems.map((item) => {
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
    </ViewerProvider>
  );
}
