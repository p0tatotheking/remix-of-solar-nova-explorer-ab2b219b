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

    // Check if admin already exists
    const { data: existingAdmin } = await supabase
      .from("app_users")
      .select("id")
      .eq("username", "p0tatotheking")
      .single();

    if (existingAdmin) {
      return new Response(
        JSON.stringify({ message: "Admin already exists", id: existingAdmin.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash the admin password
    const passwordHash = await hashPassword("Aakash912*");

    // Create admin user
    const { data: newUser, error: userError } = await supabase
      .from("app_users")
      .insert({
        username: "p0tatotheking",
        password_hash: passwordHash,
      })
      .select()
      .single();

    if (userError) throw userError;

    // Assign admin role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: newUser.id,
        role: "admin",
      });

    if (roleError) throw roleError;

    return new Response(
      JSON.stringify({ success: true, message: "Admin user created", id: newUser.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
