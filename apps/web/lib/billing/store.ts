import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { BillingStore } from "./webhook";

/** BillingStore sobre o Supabase com a service role (o webhook não tem usuário logado). */
export function supabaseBillingStore(): BillingStore {
  const db = supabaseAdmin();
  return {
    async hasEvent(id) {
      const { data } = await db.from("stripe_events").select("id").eq("id", id).maybeSingle();
      return !!data;
    },
    async markEvent(id, type) {
      const { error } = await db.from("stripe_events").upsert({ id, type }, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
    },
    async userIdForCustomer(customerId) {
      const { data } = await db.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
      return data?.user_id ?? null;
    },
    async upsertSubscription(r) {
      const { error } = await db.from("subscriptions").upsert(
        {
          user_id: r.userId,
          stripe_customer_id: r.customerId,
          stripe_subscription_id: r.subscriptionId,
          price_id: r.priceId,
          status: r.status,
          current_period_end: r.currentPeriodEnd,
          cancel_at_period_end: r.cancelAtPeriodEnd,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    async setPlan(userId, plan) {
      const { error } = await db.from("profiles").update({ plan }).eq("id", userId);
      if (error) throw error;
    },
    async emailForUser(userId) {
      const { data } = await db.auth.admin.getUserById(userId);
      if (!data.user?.email) return null;
      const { data: p } = await db.from("profiles").select("name").eq("id", userId).maybeSingle();
      return { email: data.user.email, name: p?.name ?? "" };
    },
  };
}
