"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Images, Settings, Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", icon: Sparkles, label: "文生图" },
  { href: "/edit", icon: Wand2, label: "图片编辑" },
  { href: "/gallery", icon: Images, label: "图库" },
  { href: "/settings", icon: Settings, label: "设置" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 z-40 flex h-screen w-14 flex-col items-center border-r border-[var(--color-border)] bg-[var(--color-bg-alt)]/60 py-4 backdrop-blur">
      <Link
        href="/"
        className="mb-6 flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-brand)]"
        title="Image Studio"
      >
        <Sparkles className="h-5 w-5" strokeWidth={2.2} />
      </Link>
      <nav className="flex flex-1 flex-col gap-1.5">
        {ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "group relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                active
                  ? "bg-white text-[var(--color-ink)] shadow-sm"
                  : "text-[var(--color-ink-mute)] hover:bg-white/60 hover:text-[var(--color-ink)]",
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
              <span className="pointer-events-none absolute left-12 top-1/2 z-10 -translate-y-1/2 whitespace-nowrap rounded-md bg-[var(--color-ink)] px-2 py-1 text-xs text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
