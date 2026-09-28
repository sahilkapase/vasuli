import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth";
import type { CurrentUser } from "@/lib/auth";

export function Header({ user }: { user: CurrentUser }) {
  return (
    <header className="flex h-16 items-center justify-between border-b px-4">
      <div className="md:hidden text-lg font-bold text-primary">Vasuli</div>
      <div className="hidden md:block text-sm text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{user.email}</span> ({user.role})
      </div>
      <div className="flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
        <form action={signOutAction}>
          <Button variant="ghost" size="icon" type="submit" aria-label="Sign out">
            <LogOut className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </header>
  );
}
