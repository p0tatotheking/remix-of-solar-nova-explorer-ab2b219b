import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// PBKDF2 with random salt
async function hashPasswordPBKDF2(password: string, salt?: Uint8Array): Promise<{ hash: string; salt: string }> {
  const enc = new TextEncoder();
  const actualSalt = salt || crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: actualSalt, iterations: 100000, hash: "SHA-256" },
    keyMaterial, 256
  );
  const hashArray = Array.from(new Uint8Array(derived));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const saltHex = Array.from(actualSalt).map(b => b.toString(16).padStart(2, '0')).join('');

  return { hash: hashHex, salt: saltHex };
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Legacy SHA-256 for migration comparison
async function legacySHA256(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, username, password, admin_id, user_id, new_password } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "login") {
      // Look up user
      const { data: userData, error: userError } = await supabase
        .from("app_users")
        .select("id, username, password_hash, password_salt")
        .eq("username", username)
        .maybeSingle();

      if (userError || !userData) {
        return new Response(JSON.stringify({ error: "Invalid username or password" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let matched = false;

      if (userData.password_salt) {
        // New PBKDF2 hash
        const saltBytes = hexToBytes(userData.password_salt);
        const { hash } = await hashPasswordPBKDF2(password, saltBytes);
        matched = hash === userData.password_hash;
      } else {
        // Legacy SHA-256 — check and migrate
        const legacyHash = await legacySHA256(password);
        matched = legacyHash === userData.password_hash;

        if (matched) {
          // Migrate to PBKDF2
          const { hash, salt } = await hashPasswordPBKDF2(password);
          await supabase
            .from("app_users")
            .update({ password_hash: hash, password_salt: salt })
            .eq("id", userData.id);
        }
      }

      if (!matched) {
        return new Response(JSON.stringify({ error: "Invalid username or password" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.id)
        .maybeSingle();

      return new Response(JSON.stringify({
        user_id: userData.id,
        username: userData.username,
        role: roleData?.role || "user",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "create_user") {
      // Verify admin
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: admin_id, _role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Only admins can create users" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { hash, salt } = await hashPasswordPBKDF2(password);
      const { data: newUser, error: createError } = await supabase
        .from("app_users")
        .insert({ username, password_hash: hash, password_salt: salt, created_by: admin_id })
        .select("id")
        .single();

      if (createError) throw createError;

      await supabase.from("user_roles").insert({ user_id: newUser.id, role: "user" });

      return new Response(JSON.stringify({ user_id: newUser.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "update_password") {
      // Verify admin
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: admin_id, _role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Only admins can update passwords" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { hash, salt } = await hashPasswordPBKDF2(new_password);
      await supabase
        .from("app_users")
        .update({ password_hash: hash, password_salt: salt })
        .eq("id", user_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "setup_admin") {
      // Check no admin exists
      const { data: adminExists } = await supabase.rpc("admin_exists");
      if (adminExists) {
        return new Response(JSON.stringify({ error: "Admin already exists" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { hash, salt } = await hashPasswordPBKDF2(password);
      const { data: newUser, error: createError } = await supabase
        .from("app_users")
        .insert({ username, password_hash: hash, password_salt: salt })
        .select("id")
        .single();

      if (createError) throw createError;

      await supabase.from("user_roles").insert({ user_id: newUser.id, role: "admin" });

      return new Response(JSON.stringify({
        user_id: newUser.id, username, role: "admin",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
