"use client";

import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { OutboundCallResponse } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Button from "@/components/ui/button";

export default function DialPage() {
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<OutboundCallResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const trimmed = phone.trim();
    if (!trimmed) {
      setError("Phone number is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<OutboundCallResponse>(
        "/admin/outbound/call",
        {
          method: "POST",
          body: JSON.stringify({ to_phone: trimmed }),
        }
      );
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to place call");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Dial</h1>
      <p className="text-sm text-gray-500 mb-6">
        Place an outbound call. The agent answers when the recipient picks up.
      </p>

      <Card className="max-w-md">
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-800">
            Outbound Call
          </h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone (E.164)
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {result && (
              <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                <p className="font-medium">Call initiated.</p>
                <p className="mt-1 text-xs">
                  <span className="text-green-800">call_sid:</span>{" "}
                  <code className="font-mono break-all">{result.call_sid}</code>
                </p>
                {result.status && (
                  <p className="mt-0.5 text-xs">
                    <span className="text-green-800">status:</span>{" "}
                    <code className="font-mono">{result.status}</code>
                  </p>
                )}
              </div>
            )}

            <Button type="submit" variant="default" disabled={submitting}>
              {submitting ? "Dialing…" : "Dial Now"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
