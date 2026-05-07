import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

// Tables with client_id column that are included in backups
const CLIENT_TABLES = [
  "leads",
  "contacts",
  "campaigns",
  "automations",
  "automation_runs",
  "tasks",
  "messages",
  "bots",
  "backup_configs",
  "backup_runs",
  "error_logs",
];

function escapeValue(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  if (typeof val === "object") {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

function generateInsertBlock(table: string, rows: Record<string, unknown>[]): string {
  if (!rows.length) return `-- Table: ${table} (0 rows)\n\n`;
  const cols = Object.keys(rows[0]);
  const colList = cols.map((c) => `"${c}"`).join(", ");
  const updateSet = cols
    .filter((c) => c !== "id")
    .map((c) => `"${c}" = EXCLUDED."${c}"`)
    .join(",\n    ");

  const valueLines = rows
    .map((row) => `  (${cols.map((c) => escapeValue(row[c])).join(", ")})`)
    .join(",\n");

  return (
    `-- Table: ${table} (${rows.length} rows)\n` +
    `INSERT INTO public."${table}" (${colList})\nVALUES\n${valueLines}\n` +
    `ON CONFLICT (id) DO UPDATE SET\n    ${updateSet};\n\n`
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await userClient
      .from("profiles")
      .select("role, client_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "master") return json({ error: "Forbidden" }, 403);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const clientId = profile.client_id as string;
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (!action) return json({ error: "action parameter required" }, 400);

    // ── STATUS ──────────────────────────────────────────────────────────────
    if (action === "status") {
      const stats: Record<string, number> = {};
      for (const table of CLIENT_TABLES) {
        try {
          // automation_runs links via automation, not client_id directly
          if (table === "automation_runs") {
            const { count } = await admin
              .from(table as any)
              .select("id", { count: "exact", head: true });
            stats[table] = count ?? 0;
          } else {
            const { count } = await admin
              .from(table as any)
              .select("id", { count: "exact", head: true })
              .eq("client_id", clientId);
            stats[table] = count ?? 0;
          }
        } catch {
          // table may not exist yet
        }
      }

      const { data: lastBackup } = await admin
        .from("backup_runs" as any)
        .select("*")
        .eq("client_id", clientId)
        .eq("status", "done")
        .order("finished_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: config } = await admin
        .from("backup_configs" as any)
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();

      return json({ stats, lastBackup, config });
    }

    // ── EXPORT ──────────────────────────────────────────────────────────────
    if (action === "export") {
      const runId = crypto.randomUUID();
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `backup_${clientId}_${ts}.sql`;

      await admin.from("backup_runs" as any).insert({
        id: runId,
        client_id: clientId,
        status: "running",
        type: "manual",
      });

      try {
        let sql =
          `-- uPixel CRM Database Export\n` +
          `-- Client: ${clientId}\n` +
          `-- Date: ${new Date().toISOString()}\n` +
          `-- Tables: ${CLIENT_TABLES.join(", ")}\n\n` +
          `BEGIN;\n\n`;

        const rowCounts: Record<string, number> = {};

        for (const table of CLIENT_TABLES) {
          try {
            const filter = table === "automation_runs" ? {} : { client_id: clientId };
            const query = admin.from(table as any).select("*");
            if (filter.client_id) query.eq("client_id", clientId);
            const { data: rows } = await query;

            rowCounts[table] = rows?.length ?? 0;
            sql += generateInsertBlock(table, (rows ?? []) as Record<string, unknown>[]);
          } catch (e) {
            sql += `-- Table: ${table}: skipped (${(e as Error).message})\n\n`;
            rowCounts[table] = 0;
          }
        }

        sql += `COMMIT;\n`;

        const sqlBytes = new TextEncoder().encode(sql);

        const { error: uploadErr } = await admin.storage
          .from("backups")
          .upload(`${clientId}/${filename}`, sqlBytes, {
            contentType: "text/plain",
            upsert: true,
          });

        if (uploadErr) throw uploadErr;

        const { data: signed } = await admin.storage
          .from("backups")
          .createSignedUrl(`${clientId}/${filename}`, 7 * 24 * 3600);

        await admin.from("backup_runs" as any).update({
          status: "done",
          storage_path: `${clientId}/${filename}`,
          file_size_bytes: sqlBytes.byteLength,
          row_counts: rowCounts,
          finished_at: new Date().toISOString(),
        }).eq("id", runId);

        return json({
          success: true,
          filename,
          url: signed?.signedUrl,
          row_counts: rowCounts,
          file_size_bytes: sqlBytes.byteLength,
        });
      } catch (e) {
        await admin.from("backup_runs" as any).update({
          status: "error",
          error_msg: (e as Error).message,
          finished_at: new Date().toISOString(),
        }).eq("id", runId);
        throw e;
      }
    }

    // ── LIST ─────────────────────────────────────────────────────────────────
    if (action === "list") {
      const { data: runs } = await admin
        .from("backup_runs" as any)
        .select("*")
        .eq("client_id", clientId)
        .order("started_at", { ascending: false })
        .limit(50);

      return json({ runs: runs ?? [] });
    }

    // ── DOWNLOAD (signed URL refresh) ────────────────────────────────────────
    if (action === "download") {
      const storagePath = url.searchParams.get("path");
      if (!storagePath) return json({ error: "path required" }, 400);
      if (!storagePath.startsWith(`${clientId}/`)) return json({ error: "Forbidden" }, 403);

      const { data: signed } = await admin.storage
        .from("backups")
        .createSignedUrl(storagePath, 3600);

      return json({ url: signed?.signedUrl });
    }

    // ── SCHEMA-COMPARE ───────────────────────────────────────────────────────
    if (action === "schema-compare") {
      const contentType = req.headers.get("content-type") || "";
      let backupText = "";

      if (contentType.includes("multipart/form-data")) {
        const form = await req.formData();
        const file = form.get("file") as File | null;
        if (!file) return json({ error: "file required" }, 400);
        backupText = await file.text();
      } else {
        const body = await req.json().catch(() => ({}));
        backupText = (body as any).sql || "";
      }

      const backupCounts: Record<string, number> = {};
      for (const m of backupText.matchAll(/-- Table: (\w+) \((\d+) rows\)/g)) {
        backupCounts[m[1]] = parseInt(m[2]);
      }

      const currentCounts: Record<string, number> = {};
      for (const table of CLIENT_TABLES) {
        try {
          const { count } = await admin
            .from(table as any)
            .select("id", { count: "exact", head: true })
            .eq("client_id", clientId);
          currentCounts[table] = count ?? 0;
        } catch { /* skip */ }
      }

      const allTables = new Set([...Object.keys(backupCounts), ...Object.keys(currentCounts)]);
      const comparison = Array.from(allTables).map((table) => ({
        table,
        backup: backupCounts[table] ?? null,
        current: currentCounts[table] ?? null,
        diff: (currentCounts[table] ?? 0) - (backupCounts[table] ?? 0),
      }));

      return json({ comparison });
    }

    // ── RESTORE-VALIDATE ─────────────────────────────────────────────────────
    if (action === "restore-validate") {
      const contentType = req.headers.get("content-type") || "";
      let sql = "";

      if (contentType.includes("multipart/form-data")) {
        const form = await req.formData();
        const file = form.get("file") as File | null;
        if (!file) return json({ error: "file required" }, 400);
        sql = await file.text();
      } else {
        const body = await req.json().catch(() => ({}));
        sql = (body as any).sql || "";
      }

      if (!sql) return json({ error: "SQL content required" }, 400);

      const statements = sql
        .split(";")
        .map((s: string) => s.trim())
        .filter(
          (s: string) =>
            s &&
            !s.startsWith("--") &&
            s.toLowerCase() !== "begin" &&
            s.toLowerCase() !== "commit"
        );

      const insertCount = statements.filter((s: string) => /^insert\s+into/i.test(s)).length;
      const forbidden = statements.filter((s: string) =>
        /^(drop|alter|create|truncate|delete\s+from|grant|revoke)\s/i.test(s)
      );

      if (forbidden.length > 0) {
        return json({
          valid: false,
          error: `Operações proibidas encontradas: ${forbidden
            .slice(0, 2)
            .map((s: string) => s.slice(0, 60))
            .join("; ")}`,
        });
      }

      const backupCounts: Record<string, number> = {};
      for (const m of sql.matchAll(/-- Table: (\w+) \((\d+) rows\)/g)) {
        backupCounts[m[1]] = parseInt(m[2]);
      }

      // Extract backup date from header comment
      const dateMatch = sql.match(/-- Date: (.+)/);

      return json({
        valid: true,
        total_statements: statements.length,
        insert_count: insertCount,
        tables: backupCounts,
        backup_date: dateMatch?.[1] ?? null,
      });
    }

    // ── RESTORE-EXECUTE ───────────────────────────────────────────────────────
    if (action === "restore-execute") {
      const contentType = req.headers.get("content-type") || "";
      let sql = "";

      if (contentType.includes("multipart/form-data")) {
        const form = await req.formData();
        const file = form.get("file") as File | null;
        if (!file) return json({ error: "file required" }, 400);
        sql = await file.text();
      } else {
        const body = await req.json().catch(() => ({}));
        sql = (body as any).sql || "";
      }

      if (!sql) return json({ error: "SQL content required" }, 400);

      // Final safety check
      const forbidden = sql
        .split(";")
        .map((s: string) => s.trim())
        .filter(
          (s: string) =>
            s &&
            !s.startsWith("--") &&
            s.toLowerCase() !== "begin" &&
            s.toLowerCase() !== "commit"
        )
        .filter((s: string) =>
          /^(drop|alter|create|truncate|delete\s+from|grant|revoke)\s/i.test(s)
        );

      if (forbidden.length > 0) {
        return json({ error: "Forbidden SQL operations found in file" }, 400);
      }

      // Execute via service role using the safe RPC function
      const { data: result, error: rpcError } = await admin.rpc(
        "execute_backup_restore",
        { sql_text: sql }
      );

      if (rpcError) return json({ error: rpcError.message }, 500);

      return json(result);
    }

    // ── CONFIG-GET ────────────────────────────────────────────────────────────
    if (action === "config-get") {
      const { data: config } = await admin
        .from("backup_configs" as any)
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();

      return json({
        config: config ?? { enabled: false, interval_hours: 24, retain_count: 7 },
      });
    }

    // ── CONFIG-SAVE ───────────────────────────────────────────────────────────
    if (action === "config-save") {
      const body = await req.json().catch(() => ({}));
      const { enabled, interval_hours, retain_count } = body as any;

      await admin.from("backup_configs" as any).upsert(
        {
          client_id: clientId,
          enabled: enabled ?? false,
          interval_hours: interval_hours ?? 24,
          retain_count: retain_count ?? 7,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_id" }
      );

      return json({ success: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: any) {
    console.error("database-backup error:", err);
    return json({ error: err.message || "Internal server error" }, 500);
  }
});
