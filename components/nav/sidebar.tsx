"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  PlusCircle,
  AlertTriangle,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/supabase/types";
import { useTranslation } from "@/lib/hooks/use-locale";

const LINKS = [
  { href: "/", key: "nav.home", icon: Home },
  { href: "/borrowers", key: "nav.borrowers", icon: Users },
  { href: "/collect", key: "nav.collect", icon: PlusCircle },
  { href: "/overdue", key: "nav.overdue", icon: AlertTriangle },
  { href: "/reports", key: "nav.reports", icon: BarChart3 },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-background md:flex">
      <div className="flex h-16 items-center px-5 text-lg font-bold text-primary">Vasuli</div>
      <nav className="flex-1 space-y-1 px-3">
        {LINKS.map(({ href, key, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-4.5 w-4.5" />
              {t(key)}
            </Link>
          );
        })}
        {role === "owner" && (
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
              pathname.startsWith("/settings") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            )}
          >
            <Settings className="h-4.5 w-4.5" />
            {t("nav.settings")}
          </Link>
        )}
      </nav>
    </aside>
  );
}
