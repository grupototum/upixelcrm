-- Perf: envolve chamadas de função em (select ...) nas políticas RLS para
-- avaliação única por statement em vez de por linha (advisor auth_rls_initplan).
-- Semântica idêntica — as funções são STABLE. Idempotente: só altera políticas
-- que ainda têm chamadas "nuas".
DO $$
DECLARE r record; sql text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check,
      regexp_replace(
        regexp_replace(qual,
          '(?<![a-zA-Z_.])(get_user_tenant_id|get_user_client_id|is_master_user|is_user_blocked|get_user_role)\(\)',
          '(select \1())', 'g'),
        '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g') AS new_qual,
      regexp_replace(
        regexp_replace(with_check,
          '(?<![a-zA-Z_.])(get_user_tenant_id|get_user_client_id|is_master_user|is_user_blocked|get_user_role)\(\)',
          '(select \1())', 'g'),
        '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g') AS new_check
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    IF r.new_qual IS DISTINCT FROM r.qual OR r.new_check IS DISTINCT FROM r.with_check THEN
      sql := format('ALTER POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
      IF r.new_qual IS NOT NULL THEN
        sql := sql || format(' USING (%s)', r.new_qual);
      END IF;
      IF r.new_check IS NOT NULL THEN
        sql := sql || format(' WITH CHECK (%s)', r.new_check);
      END IF;
      EXECUTE sql;
    END IF;
  END LOOP;
END $$;
