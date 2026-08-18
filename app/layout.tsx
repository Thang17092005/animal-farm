import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/app/components/Sidebar";

export const metadata: Metadata = {
  title: "Animal Farm",
  description: "Quản lý động vật",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar />

          <main className="min-w-0 flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}