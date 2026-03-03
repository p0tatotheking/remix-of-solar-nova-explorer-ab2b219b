import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const adminsToSeed = [
      { username: "p0tatotheking", password: "Aakash912*" },
      { username: "Dannygo", password: "StarWars100" },
    ];

    const result: {
      created: Array<{ username: string; id: string }>;
      alreadyExisted: Array<{ username: string; id: string }>;
    } = { created: [], alreadyExisted: [] };

    for (const admin of adminsToSeed) {
      // Check if user exists
      const { data: existingUser, error: existingError } = await supabase
        .from("app_users")
        .select("id")
        .eq("username", admin.username)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingUser?.id) {
        result.alreadyExisted.push({ username: admin.username, id: existingUser.id });
        continue;
      }

      const passwordHash = await hashPassword(admin.password);

      // Create user
      const { data: newUser, error: userError } = await supabase
        .from("app_users")
        .insert({
          username: admin.username,
          password_hash: passwordHash,
        })
        .select()
        .single();

      if (userError) throw userError;

      // Assign admin role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: newUser.id,
        role: "admin",
      });

      if (roleError) throw roleError;

      result.created.push({ username: admin.username, id: newUser.id });
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
