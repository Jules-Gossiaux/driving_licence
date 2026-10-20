import type { Metadata } from "next";
import Link from "next/link";
import { NavLinks } from "@/components/nav-links";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Permis B — Théorie",
    template: "%s · Permis B",
  },
  description:
    "Application locale d'apprentissage de la théorie du permis B en Belgique francophone.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-scroll-behavior="smooth">
      <body>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between">
              <Link href="/" className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-sm font-bold text-amber-300"
                >
                  B
                </span>
                <span className="text-sm font-semibold text-slate-950">Permis B</span>
              </Link>
              <NavLinks />
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-12">
            {children}
          </main>
          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500 sm:px-6">
              Contenu de démonstration à relire · données locales
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
