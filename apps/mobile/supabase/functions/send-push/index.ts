// supabase/functions/send-push/index.ts
//
// Invoked by a Database Webhook on `insert into public.notifications`
// (configure in Dashboard → Database → Webhooks — see the note at the
// bottom of supabase/schema.sql). Looks up the recipient's registered Expo
// push tokens and forwards the notification to Expo's push API. Runs with
// the service role key, which Supabase injects automatically for every Edge
// Function — no secrets to set manually.
//
// Deploy with: supabase functions deploy send-push

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface NotificationRow {
  id: string;
  profile_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
}

interface WebhookPayload {
  type: "INSERT";
  table: string;
  record: NotificationRow;
}

Deno.serve(async (req) => {
  try {
    const payload = (await req.json()) as WebhookPayload;
    const notification = payload.record;

    if (!notification?.profile_id) {
      return new Response(JSON.stringify({ skipped: "no profile_id" }), { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tokens, error } = await supabase
      .from("push_tokens")
      .select("expo_push_token")
      .eq("profile_id", notification.profile_id);

    if (error) throw error;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ skipped: "no push tokens for profile" }), { status: 200 });
    }

    const messages = tokens.map((t) => ({
      to: t.expo_push_token,
      title: notification.title,
      body: notification.body ?? undefined,
      data: { ...notification.data, notification_id: notification.id, type: notification.type },
      sound: "default",
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    // Expo returns one ticket per message, in the same order. Clean up
    // tokens Expo says are no longer valid so we stop paying for/attempting
    // delivery to them.
    const tickets = Array.isArray(result?.data) ? result.data : [];
    const deadTokens: string[] = [];
    tickets.forEach((ticket: { status: string; details?: { error?: string } }, i: number) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        deadTokens.push(messages[i].to);
      }
    });

    if (deadTokens.length > 0) {
      await supabase
        .from("push_tokens")
        .delete()
        .eq("profile_id", notification.profile_id)
        .in("expo_push_token", deadTokens);
    }

    return new Response(JSON.stringify({ sent: messages.length, removed: deadTokens.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-push error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
