# Gerar `JWT_SECRET`, `ANON_KEY` e `SERVICE_ROLE_KEY`

**[OPERADOR]** — executar na VPS (ou em qualquer máquina com `openssl` e
`python3`/`node`, os valores não dependem de estar na VPS, só não devem
sobrar em lugar nenhum além do `.env` real).

## 1. `JWT_SECRET`

```bash
openssl rand -base64 42
```

Copiar o resultado para `JWT_SECRET=` no `.env`.

## 2. `ANON_KEY` e `SERVICE_ROLE_KEY`

São JWTs assinados com o `JWT_SECRET` acima, com os claims:

```json
// anon
{ "role": "anon", "iss": "supabase", "iat": <agora>, "exp": <daqui a ~10 anos> }

// service_role
{ "role": "service_role", "iss": "supabase", "iat": <agora>, "exp": <daqui a ~10 anos> }
```

Opção recomendada — gerador oficial do Supabase (não pede nada além do
`JWT_SECRET`, roda no navegador, nada é enviado pra fora):
<https://supabase.com/docs/guides/self-hosting/docker#securing-your-services>

Alternativa via linha de comando com Python (sem dependência nova no repo —
`pyjwt` não faz parte do projeto uPixel, é só uma ferramenta local do
operador):

```bash
pip install --user pyjwt
python3 - <<'PY'
import jwt, time

secret = input("JWT_SECRET: ").strip()
iat = int(time.time())
exp = iat + 60 * 60 * 24 * 365 * 10  # ~10 anos

for role in ("anon", "service_role"):
    payload = {"role": role, "iss": "supabase", "iat": iat, "exp": exp}
    print(f"{role.upper()}_KEY={jwt.encode(payload, secret, algorithm='HS256')}")
PY
```

Copiar as duas linhas de saída para `ANON_KEY=` e `SERVICE_ROLE_KEY=` no
`.env`.

## 3. Checklist antes de subir a stack

- [ ] `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY` preenchidos no `.env` real
      (nunca no `.env.example`, nunca commitados).
- [ ] `POSTGRES_PASSWORD`, `DASHBOARD_PASSWORD` gerados (`openssl rand -base64 24`).
- [ ] `REALTIME_DB_ENC_KEY`, `REALTIME_SECRET_KEY_BASE` gerados (`openssl rand -base64 32` cada, valores distintos).
- [ ] Confirmar que nenhum desses valores é igual ao usado no projeto cloud
      `xusdhzwfkzufupjwbebt` — são bancos/segredos diferentes.
