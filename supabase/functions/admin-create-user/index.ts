import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Create client with user's auth token to verify they are authenticated
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Check if user is a master
    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "master") {
      return json({ error: "Only master users can create new users" }, 403);
    }

    // Parse request body
    const body = await req.json();
    const { name, email, password, role, organization_id } = body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return json({ error: "Missing required fields: name, email, password, role" }, 400);
    }

    // Validate role
    const validRoles = ["master", "supervisor", "atendente", "vendedor"];
    if (!validRoles.includes(role)) {
      return json({ error: "Invalid role. Must be one of: master, supervisor, atendente, vendedor" }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json({ error: "Invalid email format" }, 400);
    }

    // Create admin client for user creation
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if email already exists
    const { data: existingUser } = await adminClient.auth.admin.listUsers();
    if (existingUser?.users?.some(u => u.email === email)) {
      return json({ error: "Email already exists" }, 400);
    }

    // Create auth user
    const { data: { user: newAuthUser }, error: createAuthError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true, // Auto-confirm email since master is creating it
      user_metadata: {
        name: name,
        role: role,
        organization_id: organization_id || null,
      },
    });

    if (createAuthError || !newAuthUser) {
      console.error("Auth user creation error:", createAuthError);
      return json({ error: createAuthError?.message || "Failed to create auth user" }, 400);
    }

    // Create profile entry (auto-approved for master-created users)
    const { error: profileCreateError } = await adminClient
      .from("profiles")
      .insert({
        id: newAuthUser.id,
        name: name,
        email: email.toLowerCase(),
        role: role,
        client_id: user.id, // Master's client_id
        organization_id: organization_id || null,
        approval_status: "approved", // Auto-approve master-created users
        tenant_id: null,
      });

    if (profileCreateError) {
      console.error("Profile creation error:", profileCreateError);
      // Try to delete the auth user if profile creation fails
      await adminClient.auth.admin.deleteUser(newAuthUser.id);
      return json({ error: profileCreateError.message || "Failed to create user profile" }, 400);
    }

    return json({
      success: true,
      user: {
        id: newAuthUser.id,
        email: newAuthUser.email,
        name: name,
        role: role,
      },
    });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return json({ error: error.message || "Internal server error" }, 500);
  }
});
