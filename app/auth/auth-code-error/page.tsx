import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Sign-in failed</h1>
      <p className="text-sm text-muted-foreground">Something went wrong completing Google sign-in. Please try again.</p>
      <Button asChild>
        <Link href="/login">Back to login</Link>
      </Button>
    </div>
  );
}
