"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, PlusCircle, AlertTriangle, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/hooks/use-locale";

const TABS = [
  { href: "/", key: "nav.home", icon: Home },
  { href: "/borrowers", key: "nav.borrowers", icon: Users },
  { href: "/collect", key: "nav.collect", icon: PlusCircle },
  { href: "/overdue", key: "nav.overdue", icon: AlertTriangle },
  { href: "/more", key: "nav.more", icon: MoreHorizontal },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur pb-safe md:hidden">
      <ul className="flex items-stretch justify-between">
        {TABS.map(({ href, key, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const isCollect = href === "/collect";
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-medium",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isCollect ? (
                  <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                    <Icon className="h-6 w-6" />
                  </span>
                ) : (
                  <Icon className="h-5 w-5" />
                )}
                <span className={isCollect ? "mt-0.5" : undefined}>{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
