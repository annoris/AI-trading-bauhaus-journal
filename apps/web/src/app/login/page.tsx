"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/brand-logo";
import { postJson } from "@/lib/use-api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ownerLogin, setOwnerLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth", { cache: "no-store" })
      .then((response) => response.json())
      .then((mode: { multiUser?: boolean }) => {
        const isMulti = Boolean(mode.multiUser);
        const params = new URLSearchParams(window.location.search);
        const secretOwnerRequested = params.get("mode") === "owner";
        setOwnerLogin(secretOwnerRequested || !isMulti);
      })
      .catch(() => setOwnerLogin(true));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await postJson("/api/auth", ownerLogin ? { password } : { email, password });
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(ownerLogin ? "The password is incorrect." : "Email or password is incorrect.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080b0a] px-4 text-[#f1f4f1]">
      <Card className="w-full max-w-sm border-white/10 bg-[#0e1311] text-[#f1f4f1] shadow-2xl">
        <CardContent className="pt-7">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-3 text-center">
              <BrandLogo animated className="mx-auto h-16 w-40" />
              <div>
                <h1 className="text-lg font-semibold">Your private workspace</h1>
                <p className="mt-1 text-xs text-white/55">
                  Access is provided by invitation only.{" "}
                  <a
                    href="https://discord.gg/RUbBagUDA6"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#5865F2] hover:underline font-medium"
                  >
                    Request invite on Discord →
                  </a>
                </p>
                <div className="mt-2">
                  <a
                    href="/demo"
                    className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline"
                  >
                    Or explore the live interactive demo →
                  </a>
                </div>
              </div>
            </div>

            {!ownerLogin && (
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                autoComplete="username"
                autoFocus
                required
              />
            )}
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={ownerLogin ? "Owner password" : "Password"}
              autoComplete="current-password"
              autoFocus={ownerLogin}
              required
            />
            {error && <p className="text-center text-xs text-loss">{error}</p>}
            <Button type="submit" className="w-full">
              Enter workspace
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
