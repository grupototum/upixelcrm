-- read_secret: o REVOKE original (20260531000004) tirou de anon/authenticated,
-- mas o grant default em PUBLIC permaneceu — anon ainda conseguia executar
-- a função e ler segredos do Vault via /rest/v1/rpc/read_secret.
-- service_role mantém EXECUTE via grant explícito.
REVOKE EXECUTE ON FUNCTION public.read_secret(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_secret(text) TO service_role;

-- RPCs de gestão de org: só fazem sentido para usuários logados.
REVOKE EXECUTE ON FUNCTION public.owner_add_org_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_add_org_member(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.supervisor_set_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.supervisor_set_role(uuid, text) TO authenticated;
