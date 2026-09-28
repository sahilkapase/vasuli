import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomTabBar } from "@/components/nav/bottom-tab-bar";
import { Header } from "@/components/nav/header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">{children}</main>
        <BottomTabBar />
      </div>
    </div>
  );
}
