"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "../actions";
import { Eye, EyeOff, Loader2, Lock, Mail, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [state, formAction, isPending] = useActionState(loginAction, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [isPinMode, setIsPinMode] = useState(false);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div className="space-y-5 flex flex-col group">
        {!isPinMode ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground/80 font-medium">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="pl-10 h-11 bg-background/50 transition-all focus:bg-background border-border/50 hover:border-border"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground/80 font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="pl-10 pr-10 h-11 bg-background/50 transition-all focus:bg-background border-border/50 hover:border-border"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="pin" className="text-foreground/80 font-medium">Secure PIN Code</Label>
            <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="pin"
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  className="pl-10 h-11 bg-background/50 transition-all focus:bg-background tracking-[0.5em] text-lg font-bold border-border/50 hover:border-border"
                  placeholder="••••"
                />
              </div>
          </div>
        )}
      </div>

      {state?.error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 animate-in fade-in slide-in-from-top-2">
          {state.error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-11 text-base shadow-lg shadow-primary/25 transition-transform active:scale-[0.98]"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
        ) : null}
        {isPending ? "Signing in..." : "Sign In"}
      </Button>

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => setIsPinMode(!isPinMode)}
          className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
        >
          {isPinMode ? "Sign in with Password" : "Sign in with PIN"}
        </button>
      </div>
    </form>
  );
}
