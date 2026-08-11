// Idempotência de mensagens por id externo do provedor.
//
// Dois problemas reais que isto resolve:
//
// 1. A Meta reentrega o mesmo evento sempre que não recebe 200 em ~20s. Sem
//    checagem, cada reentrega virava mensagem duplicada no inbox, unread_count
//    inflado, automação disparada de novo e bot executado de novo (o cliente
//    recebia a mesma sequência 2-3x).
// 2. No canal Evolution, o CRM persiste a mensagem no envio (whatsapp-proxy) e
//    depois recebe o eco `fromMe` pelo webhook — gravando a MESMA mensagem
//    outbound duas vezes. Como o proxy passou a gravar o `whatsapp_message_id`
//    devolvido pela Evolution, o eco agora casa por id e é descartado aqui.
//
// Os índices parciais que tornam isto barato estão em
// 20260810160000_inbox_bot_perf_indexes.sql — sem eles cada checagem é um
// seq scan em `messages`.

/** Chave dentro de `messages.metadata` onde cada canal guarda o id do provedor. */
export type ExternalIdKey = "meta_message_id" | "whatsapp_message_id" | "mid";

export async function isDuplicateMessage(
  adminClient: { from: (t: string) => any },
  key: ExternalIdKey,
  externalId: string | null | undefined,
): Promise<boolean> {
  if (!externalId) return false;
  const { data, error } = await adminClient
    .from("messages")
    .select("id")
    .eq(`metadata->>${key}`, externalId)
    .limit(1)
    .maybeSingle();
  // Fail-open: se a checagem falhar, prefere uma possível duplicata a perder
  // a mensagem do cliente (mesma política do rate limit compartilhado).
  if (error) {
    console.error(`[messageDedup] falha ao checar ${key}=${externalId}:`, error.message);
    return false;
  }
  return !!data;
}
