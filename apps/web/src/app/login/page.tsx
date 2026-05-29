"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";

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
    <div className="flex min-h-full items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">
          Veerox Admin
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Enter your admin token to continue.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="token"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Admin Token
            </label>
            <input
              id="token"
              type="password"
              autoComplete="current-password"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setError(null);
              }}
              placeholder="Paste token here"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <Button type="submit" variant="default" className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-xs text-gray-400">
          Token is stored in your browser&apos;s localStorage. It is sent as
          the <code>X-Admin-Token</code> header on every API request.
        </p>
      </div>
    </div>
  );
}
