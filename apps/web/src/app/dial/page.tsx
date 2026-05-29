"use client";

import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { OutboundCallResponse } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Button from "@/components/ui/button";
import { Phone, AlertCircle, CheckCircle2, Info } from "lucide-react";

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
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dial</h1>
        <p className="mt-1 text-sm text-slate-500">Place an outbound call — the AI agent answers when the recipient picks up.</p>
      </div>

      <div className="max-w-md">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
                <Phone size={16} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Outbound Call</h2>
                <p className="text-xs text-slate-400">via Twilio + AI agent</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Phone Number (E.164)
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition font-mono"
                />
                <p className="mt-1.5 text-xs text-slate-400">Include country code, e.g. +91 for India</p>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />{error}
                </div>
              )}

              {result && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                  <p className="font-bold mb-1 flex items-center gap-1.5"><CheckCircle2 size={14} /> Call initiated!</p>
                  <p className="text-xs font-mono break-all text-emerald-600">SID: {result.call_sid}</p>
                  {result.status && <p className="text-xs mt-0.5 text-emerald-500">Status: {result.status}</p>}
                </div>
              )}

              <Button type="submit" variant="default" disabled={submitting} className="w-full py-3 gap-2">
                <Phone size={15} />{submitting ? "Dialing…" : "Dial Now"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info box */}
        <div className="mt-4 rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3">
          <p className="text-xs text-indigo-600 font-semibold mb-1 flex items-center gap-1.5"><Info size={12} /> How it works</p>
          <p className="text-xs text-indigo-500">Twilio calls the recipient → AI agent joins → conversation is logged automatically.</p>
        </div>
      </div>
    </div>
  );
}
