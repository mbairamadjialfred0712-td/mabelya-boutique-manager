import { supabase } from "@/integrations/supabase/client";

export async function logActivity(
  action: string,
  details?: string,
  entityType?: string,
  entityId?: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("activity_logs").insert({
    user_id: user.id,
    action,
    details: details ?? null,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
  });
}
