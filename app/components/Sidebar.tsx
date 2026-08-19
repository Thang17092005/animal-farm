"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const menuItems = [
  {
    name: "Tổng quan",
    shortName: "Trang chủ",
    icon: "🏠",
    path: "/",
  },
  {
    name: "Động vật",
    shortName: "Động vật",
    icon: "🐾",
    path: "/animals",
  },
  {
    name: "Lịch cho ăn",
    shortName: "Cho ăn",
    icon: "🍖",
    path: "/feeding",
  },
  {
    name: "Sinh sản",
    shortName: "Sinh sản",
    icon: "🥚",
    path: "/breeding",
  },
  {
    name: "Tài chính",
    shortName: "Tài chính",
    icon: "💰",
    path: "/finance",
  },
  {
    name: "Báo cáo",
    shortName: "Báo cáo",
    icon: "📊",
    path: "/reports",
  },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [moreOpen, setMoreOpen] = useState(false);

  function isActive(path: string) {
    if (path === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(path);
  }

  function goTo(path: string) {
    setMoreOpen(false);
    router.push(path);
  }

  return (
    <>
      {/* =========================================================
          SIDEBAR CHO MÁY TÍNH
          ========================================================= */}

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-5 md:block">
        {/* Logo */}

        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
            🐍
          </div>

          <div>
            <h1 className="font-bold text-slate-900">
              Animal Farm
            </h1>

            <p className="text-xs text-slate-500">
              Quản lý động vật
            </p>
          </div>
        </div>

        {/* Menu máy tính */}

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => goTo(item.path)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                  active
                    ? "bg-emerald-50 font-semibold text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="text-lg">
                  {item.icon}
                </span>

                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Cài đặt */}

        <div className="mt-8 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => {
              // Chưa có trang Cài đặt.
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-slate-600 transition hover:bg-slate-50"
          >
            <span className="text-lg">⚙️</span>

            <span>Cài đặt</span>
          </button>
        </div>
      </aside>

      {/* =========================================================
          THANH ĐIỀU HƯỚNG CHO ĐIỆN THOẠI
          ========================================================= */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {/* Trang chủ */}

          {menuItems.slice(0, 4).map((item) => {
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => goTo(item.path)}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 transition ${
                  active
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-500 active:bg-slate-100"
                }`}
              >
                <span className="text-xl leading-none">
                  {item.icon}
                </span>

                <span
                  className={`max-w-full truncate text-[10px] ${
                    active
                      ? "font-semibold"
                      : "font-medium"
                  }`}
                >
                  {item.shortName}
                </span>
              </button>
            );
          })}

          {/* KHÁC */}

          <button
            type="button"
            onClick={() => setMoreOpen((value) => !value)}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 transition ${
              moreOpen ||
              isActive("/finance") ||
              isActive("/reports")
                ? "bg-emerald-50 text-emerald-700"
                : "text-slate-500 active:bg-slate-100"
            }`}
          >
            <span className="text-xl leading-none">
              ⋯
            </span>

            <span className="text-[10px] font-medium">
              Khác
            </span>
          </button>
        </div>
      </nav>

      {/* =========================================================
          MENU KHÁC TRÊN ĐIỆN THOẠI
          ========================================================= */}

      {moreOpen && (
        <>
          {/* Lớp nền */}

          <button
            type="button"
            aria-label="Đóng menu"
            onClick={() => setMoreOpen(false)}
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
          />

          {/* Hộp menu */}

          <div className="fixed bottom-[76px] left-3 right-3 z-50 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl md:hidden">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Thêm
            </p>

            {/* Tài chính */}

            <button
              type="button"
              onClick={() => goTo("/finance")}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                isActive("/finance")
                  ? "bg-emerald-50 font-semibold text-emerald-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="text-xl">💰</span>

              <span>Tài chính</span>
            </button>

            {/* Báo cáo */}

            <button
              type="button"
              onClick={() => goTo("/reports")}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                isActive("/reports")
                  ? "bg-emerald-50 font-semibold text-emerald-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="text-xl">📊</span>

              <span>Báo cáo</span>
            </button>

            {/* Cài đặt */}

            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-slate-700 transition hover:bg-slate-50"
            >
              <span className="text-xl">⚙️</span>

              <span>Cài đặt</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}