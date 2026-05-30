"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, MessageSquare } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  useToast,
} from "@/components/ui";
import { useOutboundWhatsApp } from "@/lib/hooks";

const whatsappSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+\d{8,15}$/, "Enter a valid E.164 number, e.g. +919876543210"),
  text: z.string().trim().min(1, "Message body is required."),
});

type WhatsAppForm = z.infer<typeof whatsappSchema>;

export default function UserDetailPage() {
  const params = useParams();
  const id =
    typeof params.id === "string" ? params.id : params.id?.[0] ?? "";

  const { toast } = useToast();
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const outboundWhatsApp = useOutboundWhatsApp();

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<WhatsAppForm>({
    resolver: zodResolver(whatsappSchema),
    defaultValues: { phone: "", text: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setLastMessageId(null);
    outboundWhatsApp.mutate(
      { phone: values.phone, text: values.text },
      {
        onSuccess: (res) => {
          setLastMessageId(res.wa_message_id);
          // Clear the textarea but keep the phone for follow-up messages.
          reset({ phone: getValues("phone"), text: "" });
          toast({
            title: "Message sent",
            description: res.wa_message_id
              ? `Meta id ${res.wa_message_id}`
              : "Queued (no Meta id in local dev).",
            variant: "success",
          });
        },
        onError: (err) => {
          toast({
            title: "Send failed",
            description: err.message,
            variant: "error",
          });
        },
      },
    );
  });

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href="/conversations"
        className="mb-4 inline-flex items-center gap-1.5 rounded-sm text-sm text-slate-500 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <ArrowLeft size={15} aria-hidden /> Back
      </Link>

      <PageHeader
        title="User"
        description={`User ID: ${id || "—"}`}
      />

      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-200">
              <MessageSquare size={16} aria-hidden />
            </div>
            <div>
              <CardTitle>Send WhatsApp Message</CardTitle>
              <p className="text-xs text-slate-400">
                Outbound message attributed to the admin token.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <div>
              <Label htmlFor="phone" required>
                Phone (E.164)
              </Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+919876543210"
                className="font-mono"
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                {...register("phone")}
              />
              {errors.phone && (
                <p id="phone-error" className="mt-1.5 text-xs text-red-600">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="text" required>
                Message
              </Label>
              <Textarea
                id="text"
                rows={5}
                placeholder="Type the message to send…"
                aria-invalid={errors.text ? true : undefined}
                aria-describedby={errors.text ? "text-error" : undefined}
                {...register("text")}
              />
              {errors.text && (
                <p id="text-error" className="mt-1.5 text-xs text-red-600">
                  {errors.text.message}
                </p>
              )}
            </div>

            {lastMessageId !== null && (
              <div
                role="status"
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              >
                <p className="mb-1 flex items-center gap-1.5 font-bold">
                  <CheckCircle2 size={14} aria-hidden /> Message sent
                </p>
                <p className="break-all font-mono text-xs text-emerald-600">
                  wa_message_id: {lastMessageId}
                </p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              loading={outboundWhatsApp.isPending}
            >
              {!outboundWhatsApp.isPending && (
                <MessageSquare size={15} aria-hidden />
              )}
              {outboundWhatsApp.isPending ? "Sending…" : "Send Message"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
