"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Lager", icon: "🏠" },
  { href: "/product-details", label: "Produkte", icon: "📦" },
  { href: "/current-stock", label: "Bestand", icon: "🗄️" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 bg-white/95 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-2 px-4 py-3">
        {navItems.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                active
                  ? "bg-[#1f4d2b] text-white shadow-md"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}