"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { OutboundWhatsAppResponse } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Button from "@/components/ui/button";

// Minimal user record shape — we tolerate the endpoint not existing.
interface UserRecord {
  id: string;
  phone?: string;
  name?: string | null;
}

export default function UserDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";

  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Try to prefill the phone from the user record if the endpoint exists.
  // Failure is silent — operator can type it in manually.
  useEffect(() => {
    if (!id) return;
    apiFetch<UserRecord>(`/admin/users/${id}`)
      .then((user) => {
        if (user.phone) setPhone(user.phone);
      })
      .catch(() => {
        // Endpoint may not exist; the manual phone input still works.
      });
  }, [id]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedPhone = phone.trim();
    const trimmedText = text.trim();
    if (!trimmedPhone) {
      setError("Phone number is required.");
      return;
    }
    if (!trimmedText) {
      setError("Message body is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<OutboundWhatsAppResponse>(
        "/admin/outbound/whatsapp",
        {
          method: "POST",
          body: JSON.stringify({ phone: trimmedPhone, text: trimmedText }),
        }
      );
      const detail = res.wa_message_id ? ` (id: ${res.wa_message_id})` : "";
      setSuccess(`Message sent${detail}.`);
      setText("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/conversations"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">User</h1>
      </div>

      <p className="text-xs text-gray-400 font-mono mb-6 break-all">
        User ID: {id}
      </p>

      <Card className="max-w-xl">
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-800">
            Send WhatsApp Message
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Outbound message attributed to the admin token.
          </p>
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

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Message
              </label>
              <textarea
                id="message"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder="Type the message to send…"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <Button type="submit" variant="default" disabled={submitting}>
              {submitting ? "Sending…" : "Send Message"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
