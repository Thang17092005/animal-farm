"use client";

import { usePathname, useRouter } from "next/navigation";

const menuItems = [
  {
    name: "Tổng quan",
    icon: "🏠",
    path: "/",
  },
  {
    name: "Động vật",
    icon: "🐾",
    path: "/animals",
  },
  {
    name: "Lịch cho ăn",
    icon: "🍖",
    path: "/feeding",
  },
  {
    name: "Sinh sản",
    icon: "🥚",
    path: "/breeding",
  },
  {
    name: "Tài chính",
    icon: "💰",
    path: "/finance",
  },
  {
    name: "Báo cáo",
    icon: "📊",
    path: "/reports",
  },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  function isActive(path: string) {
    if (path === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(path);
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-5 md:block">
      {/* Logo */}

      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
          🐍
        </div>

        <div>
          <h1 className="font-bold">
            Animal Farm
          </h1>

          <p className="text-xs text-slate-500">
            Quản lý động vật
          </p>
        </div>
      </div>

      {/* Menu */}

      <nav className="space-y-2">
        {menuItems.map((item) => {
          const active =
            isActive(item.path);

          return (
            <button
              key={item.path}
              type="button"
              onClick={() =>
                router.push(item.path)
              }
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                active
                  ? "bg-emerald-50 font-semibold text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="text-lg">
                {item.icon}
              </span>

              <span>
                {item.name}
              </span>
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
            // Không hiển thị popup nữa.
          }}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-slate-600 transition hover:bg-slate-50"
        >
          <span className="text-lg">
            ⚙️
          </span>

          <span>
            Cài đặt
          </span>
        </button>
      </div>
    </aside>
  );
}