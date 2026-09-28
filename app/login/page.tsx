"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginCard />
    </Suspense>
  );
}

function LoginCard() {
  const params = useSearchParams();
  const error = params.get("error");

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-primary">Vasuli</CardTitle>
          <CardDescription>Money-lending record system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error === "not_allowlisted" && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              This Google account isn&apos;t authorized. Ask an owner to add your email in Settings.
            </p>
          )}
          <Button className="w-full" size="lg" onClick={signInWithGoogle}>
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
