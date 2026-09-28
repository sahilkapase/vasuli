import Link from "next/link";
import { BarChart3, Settings, LogOut } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";

export default async function MorePage() {
  const user = await requireUser();

  const links = [
    { href: "/reports", label: "Reports", icon: BarChart3 },
    ...(user.role === "owner" ? [{ href: "/settings", label: "Settings", icon: Settings }] : []),
  ];

  return (
    <div className="space-y-2 p-4">
      <h1 className="mb-2 text-xl font-bold">More</h1>
      {links.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Icon className="h-5 w-5 text-primary" />
              <span className="font-medium">{label}</span>
            </CardContent>
          </Card>
        </Link>
      ))}
      <form action={signOutAction}>
        <button type="submit" className="w-full">
          <Card>
            <CardContent className="flex items-center gap-3 p-4 text-destructive">
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sign out</span>
            </CardContent>
          </Card>
        </button>
      </form>
    </div>
  );
}
