"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Tableau de bord" },
  { href: "/chapitres", label: "Chapitres" },
  { href: "/entrainement", label: "Entraînement" },
  { href: "/examen", label: "Examen" },
  { href: "/revision", label: "Révision" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation principale" className="flex items-center gap-1 overflow-x-auto">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              active
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
