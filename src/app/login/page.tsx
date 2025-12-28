"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { supabase } from "@/lib/supabase/client";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) {
          router.replace("/dashboard");
        } else {
          setCheckingSession(false);
        }
      })
      .catch(() => setCheckingSession(false));

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          router.replace("/dashboard");
        }
      },
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && !displayName.trim()) {
      setError("Name is required.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const { error: authError } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName.trim() } },
        });

    if (authError) {
      setError(authError.message);
    } else {
      setMessage(
        mode === "signin"
          ? "Signed in. Redirecting..."
          : "Account created. Awaiting admin approval.",
      );
      if (mode === "signin") {
        router.replace("/dashboard");
      }
    }

    setLoading(false);
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-8 sm:px-6 lg:px-8 sm:py-12 overflow-y-auto">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl ring-1 ring-zinc-200">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">
            {mode === "signin" ? "Welcome back" : "Create an account"}
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            {mode === "signin"
              ? "Sign in to access the room management system"
              : "Enter your details to get started"}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleAuth}>
          <div className="space-y-4">
            {mode === "signup" && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Full Name
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-zinc-400 text-sm">Aa</span>
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="block w-full rounded-lg border border-zinc-300 bg-zinc-50 py-2.5 pl-10 pr-3 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-500 sm:text-sm transition-colors"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700"
              >
                Email address
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-zinc-400" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 bg-zinc-50 py-2.5 pl-10 pr-3 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-500 sm:text-sm transition-colors"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700"
              >
                Password
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-zinc-400" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 bg-zinc-50 py-2.5 pl-10 pr-10 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-500 sm:text-sm transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          )}

          {message && !error && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-100">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-lg bg-zinc-900 py-2.5 px-4 text-sm font-semibold text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:bg-zinc-600 disabled:cursor-not-allowed transition-all"
          >
            {loading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-zinc-500">
                {mode === "signin" ? "New to the platform?" : "Already have an account?"}
              </span>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              className="text-sm font-medium text-zinc-900 hover:underline"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setMessage(null);
              }}
            >
              {mode === "signin" ? "Create an account" : "Sign in instead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

