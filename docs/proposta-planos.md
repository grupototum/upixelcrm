# Proposta de Limites por Plano — uPixel CRM

**Status:** 🟡 Aguardando aprovação do time comercial
**Criado em:** 2026-05-11
**Última revisão:** 2026-05-11

---

## TL;DR

Definir limites claros por plano (Starter / Pro / Business) com **destaque comercial para a possibilidade de add-on de número WhatsApp extra a R$ 39/mês**, evitando upgrade forçado e aumentando receita recorrente.

A maior dor operacional do uPixel é o WhatsApp (custo de infra Evolution + suporte). Os outros limites são complementares e servem pra empurrar evolução natural de planos.

---

## 📋 Tabela de Limites Propostos

| Recurso | Starter (R$ 149) | Pro (R$ 297) | Business (R$ 397) |
|---|---|---|---|
| **Usuários** | 2 | 6 | 10 |
| **Leads** | 2.000 | 10.000 | 50.000 |
| **Números WhatsApp conectados** | **1** | **3** | **10** |
| **Mensagens recebidas/mês** | 5.000 | 25.000 | 100.000 |
| **Disparos pagos (créditos inclusos)** | 0 | 500 | 2.000 |
| **Automações ativas** | 5 | 25 | Ilimitado |
| **Bots de IA** | 1 | 5 | Ilimitado |
| **Histórico de leads/conversas** | 6 meses | 12 meses | Ilimitado |
| **Importação CSV/JSON** | 1×/mês | Ilimitado | Ilimitado |
| **Relatórios avançados (ROI, etc.)** | ❌ | ✅ | ✅ |
| **API REST pública** | ❌ | ✅ | ✅ |
| **White-label** | ❌ | ❌ | ✅ |

### Lógica do limite de números WhatsApp

- **Starter (1 número):** PME com um único número de atendimento. Não precisa de mais.
- **Pro (3 números):** vendas / suporte / pós-venda separados — uso típico de empresas com time.
- **Business (10 números):** agências e ops grandes com filiais / departamentos.

---

## 🔥 Destaque comercial: Add-on de WhatsApp extra

> **Esse é o ponto que o comercial mais quer explorar — revenue recorrente sem fricção de upgrade.**

### Proposta

- **+R$ 39/mês por número WhatsApp adicional** acima do plano contratado
- Disponível em qualquer plano (Starter, Pro, Business)
- Vende **sem forçar upgrade** → ideal pra cliente que tá quase precisando ir pra Business mas só quer um número a mais
- Cobrança recorrente na mesma fatura do plano

### Por que funciona

1. **Margem boa** — infra Evolution escala bem; cada número extra custa pouco para o uPixel
2. **Conversão alta** — cliente que pediu "só mais um número" prefere pagar R$ 39 do que migrar plano inteiro
3. **Stickness** — cada número extra é um lock-in adicional (cliente recua de cancelar)
4. **Upsell natural** — quem chega a 3-4 add-ons no Pro acaba migrando pra Business sozinho (porque ficou mais caro que o Business)

### Cenários ilustrativos

| Cenário | Plano + add-ons | Total/mês | Sem add-on (upgrade forçado) | Receita preservada |
|---|---|---|---|---|
| Cliente Pro precisa de 1 número extra (4 total) | Pro + 1 add-on | R$ 336 | Upgrade Business R$ 397 | **+R$ 39** vs. perder cliente |
| Cliente Pro precisa de 2 números extras (5 total) | Pro + 2 add-ons | R$ 375 | Upgrade Business R$ 397 | Praticamente igual, mas cliente fica mais leve |
| Cliente Pro precisa de 4 números extras (7 total) | Pro + 4 add-ons | R$ 453 | Business R$ 397 | Aqui o cliente DEVE migrar pra Business — sistema sugere upgrade |

### Trigger inteligente de upgrade

Quando soma plano + add-ons ficar **≥ 90% do preço do próximo plano**, o sistema mostra:

> "Você está pagando R$ 375 (Pro + 2 add-ons). Com o Business por R$ 397 você teria 10 números, ilimitado em automações e relatórios avançados. Quer subir?"

Isso garante que o add-on não canibalize a receita do upgrade — só captura quem REALMENTE não quer migrar.

---

## ⚙️ Comportamento dos limites

### Hard cap (impede ação)

Mensagem clara quando o cliente tenta criar acima do limite:

> "Você está usando **3 de 3 números** do plano Pro. Para adicionar mais, **faça upgrade para Business** (R$ 397) ou **compre 1 número extra por R$ 39/mês**."

Botões: `Comprar add-on` | `Ver planos` | `Cancelar`

### Soft warning (80%)

> "Você está com **4 de 5 automações ativas**. Considere fazer upgrade para o Business para automações ilimitadas."

Não bloqueia, só sinaliza.

### Downgrade — o que acontece com excesso

Cliente está no Business com 8 números, faz downgrade pra Pro (3 números). Duas opções:

**Opção A (recomendada):** sistema **bloqueia novos envios** dos 5 números excedentes mas mantém os dados/histórico. Cliente escolhe quais 3 manter ativos. Os outros podem ser religados ao fazer upgrade.

**Opção B:** sistema cobra automaticamente os 5 excedentes como add-on (5 × R$ 39 = R$ 195/mês) até o cliente desconectar manualmente.

A opção A é mais ética; a opção B captura mais receita mas pode gerar churn por surpresa de fatura.

---

## 🛠️ Roadmap de implementação

| Sprint | Entrega |
|---|---|
| **1** | Adicionar coluna `max_whatsapp_instances` em `plans`; bloqueio server-side em `create-managed-instance`; UI "X de Y números usados" no card de WhatsApp |
| **2** | Soft warnings em automações, usuários, leads (no UI antes de bater no limite) |
| **3** | Fluxo de add-on (compra de número extra via Asaas, cobrança recorrente) |
| **4** | Política de downgrade — UI de "escolha quais N manter ativos" |
| **5** | Trigger inteligente de upgrade quando add-ons ≥ 90% do preço do plano superior |

---

## 📊 Métricas para acompanhar pós-lançamento

- **Conversão no limite:** % de clientes que sobem de plano ao bater no limite (vs. compram add-on vs. cancelam)
- **ARPU por plano:** receita média por cliente em cada plano, antes e depois do add-on
- **Mix de receita:** % vindo do plano vs. % vindo de add-ons
- **Churn no downgrade:** % de clientes que cancelam após bater no limite
- **Tempo até o primeiro add-on:** dias entre signup e primeira compra de número extra

---

## ❓ Perguntas abertas para o comercial

1. **R$ 39/mês é o preço certo?** Comparar com o custo real por número (Evolution + suporte) e com a tabela do Kommo/Z-API.
2. **Starter merece 1 número ou 0?** Argumento pra 0: força quem precisa de WhatsApp a já entrar no Pro. Argumento pra 1: starter sem WhatsApp não vende em PT-BR.
3. **Limites de mensagens/mês** (5k / 25k / 100k) — esses são chutes. Conferir com dados reais dos clientes atuais.
4. **Downgrade opção A vs B** — qual o time prefere? A é mais ética, B captura mais.
5. **Bots de IA — limite por plano** faz sentido? Ou todo plano com IA tem ilimitado?
6. **Período de retenção de histórico** (6 / 12 / ilimitado) — alguém vai ver isso como bloqueador?

---

## 📌 Próximos passos

1. **[Comercial]** Revisar tabela e responder as 6 perguntas abertas acima
2. **[Comercial]** Aprovar o pricing do add-on (R$ 39/mês ou ajustar)
3. **[Comercial + Produto]** Definir trigger de upgrade automático (ou manter manual)
4. **[Engenharia]** Após aprovação, abrir sessão dedicada de implementação (5 sprints estimados)

---

*Documento aberto pra discussão. Editar à vontade conforme o time comercial responder.*
