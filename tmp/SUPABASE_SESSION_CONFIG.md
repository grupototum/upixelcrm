# Configurar duração de sessão no Supabase

1. Acessar o painel do projeto Supabase
2. Authentication → Settings → JWT Expiry
3. Alterar de 3600 (1h) para 86400 (24 horas) ou 604800 (7 dias)
4. Salvar e testar

Isso faz com que o token do usuário dure mais tempo, reduzindo relogins mesmo sem a página aberta. `autoRefreshToken: true` (já configurado em `src/integrations/supabase/client.ts`) renova o token automaticamente enquanto a aba fica aberta; esse ajuste no painel afeta o tempo de vida do refresh token em si (sessão persistida entre fechamentos de navegador/dias).

Não é feito via código/migration — é configuração do painel Supabase Cloud/self-hosted.
