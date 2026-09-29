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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/login_animation.mp4"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
      />
      {/* card sits centered so it covers the watermark baked into the video */}
      <Card className="relative w-full max-w-sm bg-background/90 backdrop-blur-sm">
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
