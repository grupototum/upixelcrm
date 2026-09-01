# Configurar OpenWA (Totum SDR) no uPixelCRM

## Modo Avançado (funciona por tenant, sem env vars globais)

1. Abrir uPixelCRM → Configurações → WhatsApp
2. Clicar em "Adicionar número" → escolher "Modo Avançado"
3. Preencher:
   - URL do Servidor: URL do OpenWA (ex: `https://zap.grupototum.com`)
   - Nome da Instância: **o `id` da sessão no OpenWA** (não o nome amigável — o proxy usa esse valor direto nas URLs da API)
   - API Key: a `X-API-Key` do OpenWA
4. Salvar e escanear QR code

**Atenção:** o modo avançado hoje só fala o protocolo do servidor configurado nas
env vars globais (`UPIXEL_WA_TYPE`, ver abaixo) — não dá pra ter Evolution e OpenWA
ao mesmo tempo em tenants diferentes nesta versão. Se isso virar necessário, o
`isOpenWA` precisa ser decidido por config da instância, não só por env var global.

## Modo Gerenciado (recomendado — 1 clique por tenant)

Adicionar nas Secrets da Edge Function (Supabase Dashboard → Edge Functions →
whatsapp-proxy → Secrets, ou `supabase secrets set`):

```
UPIXEL_WA_URL=https://zap.grupototum.com
UPIXEL_WA_KEY=<a X-API-Key do OpenWA>
UPIXEL_WA_TYPE=openwa
```

Se o servidor estiver atrás de Basic Auth (Traefik), adicionar também:
```
UPIXEL_WA_BASIC_USER=<usuário>
UPIXEL_WA_BASIC_PASS=<senha>
```

Depois de configurado, o botão "Conectar número" no modo simples usa o OpenWA
automaticamente. As variáveis antigas (`UPIXEL_EVOLUTION_URL`/`UPIXEL_EVOLUTION_KEY`)
continuam funcionando como fallback — nada quebra pra quem ainda está na Evolution.

## Antes de anunciar como resolvido

Ver `tmp/OPENWA_INTEGRATION_PENDING.md` — **mensagens recebidas do cliente ainda
não chegam ao CRM** (o receptor de webhook só entende o formato da Evolution).
Conectar e enviar funcionam; receber não, até essa segunda etapa ser feita.
