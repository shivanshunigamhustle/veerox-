"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import { LogIn, AlertCircle } from "lucide-react";

const TOKEN_KEY = "veerox_admin_token";

export default function LoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) {
      setError("Please enter your admin token.");
      return;
    }
    localStorage.setItem(TOKEN_KEY, trimmed);
    router.push("/");
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-slate-100 to-indigo-50">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white text-2xl font-extrabold shadow-xl shadow-indigo-200 mb-4">
            V
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Veerox AI</h1>
          <p className="text-sm text-slate-500 mt-1">Admin Dashboard</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60">
          <h2 className="text-base font-bold text-slate-800 mb-1">Sign in</h2>
          <p className="text-sm text-slate-500 mb-6">Enter your admin token to continue.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="token" className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                Admin Token
              </label>
              <input
                id="token"
                type="password"
                autoComplete="current-password"
                value={token}
                onChange={(e) => { setToken(e.target.value); setError(null); }}
                placeholder="Paste token here"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertCircle size={14} />{error}
              </p>
            )}

            <Button type="submit" variant="default" className="w-full py-2.5 mt-1 gap-2">
              <LogIn size={15} /> Sign in
            </Button>
          </form>

          <p className="mt-5 text-xs text-slate-400 text-center">
            Token is sent as <code className="font-mono bg-slate-100 px-1 rounded">X-Admin-Token</code> on every request.
          </p>
        </div>
      </div>
    </div>
  );
}
