"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { postJson } from "@/lib/use-api";

export default function AcceptInvitationPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const invitationToken = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(invitationToken);
    if (!invitationToken) {
      setError("This invitation link is invalid or unavailable.");
      setLoading(false);
      return;
    }
    fetch(`/api/invitations/validate?token=${encodeURIComponent(invitationToken)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("This invitation link is invalid or unavailable.");
        return (await response.json()) as { email: string };
      })
      .then((invitation) => setEmail(invitation.email))
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "This invitation link is invalid."),
      )
      .finally(() => setLoading(false));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 12) {
      setError("Use at least 12 characters for your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    try {
      await postJson("/api/invitations/redeem", { token, password });
      router.push("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not accept this invitation.");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080b0a] px-4 py-10 text-[#f1f4f1]">
      <Card className="w-full max-w-sm border-white/10 bg-[#0e1311] text-[#f1f4f1] shadow-2xl">
        <CardContent className="space-y-5 pt-7">
          <div className="space-y-3 text-center">
            <BrandLogo className="mx-auto h-14 w-48" />
            <div>
              <h1 className="text-lg font-semibold">Join your workspace</h1>
              <p className="mt-1 text-xs text-white/55">Your journal starts private to you.</p>
            </div>
          </div>
          {loading ? (
            <p className="py-4 text-center text-sm text-white/55">Checking invitation…</p>
          ) : error && !email ? (
            <p role="alert" className="text-center text-sm text-red-300">
              {error}
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <Input value={email} readOnly aria-label="Invitation email" />
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password (12+ characters)"
                autoComplete="new-password"
                minLength={12}
                maxLength={1024}
                required
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                minLength={12}
                maxLength={1024}
                required
              />
              {error && (
                <p role="alert" className="text-center text-xs text-red-300">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full">
                Accept invitation
              </Button>
            </form>
          )}
          <div className="flex justify-center gap-4 text-xs text-white/50">
            <Link href="/demo" className="underline underline-offset-4 hover:text-white">
              View the example profile
            </Link>
            <Link href="/login" className="underline underline-offset-4 hover:text-white">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
