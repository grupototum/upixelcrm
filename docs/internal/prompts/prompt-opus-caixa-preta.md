# PROMPT — Teste de Caixa Preta: upixelcrm

## Contexto

- **Projeto:** upixelcrm-main (uPixel CRM)
- **Local:** `/Users/israellemos/Documents/Pixel Systems/upixelcrm-main/`
- **Stack:** React + TypeScript + Vite + Tailwind + shadcn/ui + Supabase
- **Objetivo:** Mapear todos os bugs visuais, botões que não funcionam e fluxos quebrados — testando como um usuário real

## O que fazer

Execute um **teste de caixa preta completo** no upixelcrm. Navegue por todas as telas como se fosse um usuário pela primeira vez.

## O que reportar

Para cada problema encontrado, registre:

| Campo | Descrição |
|---|---|
| **Tela** | Onde encontrou (ex: "Configurações > WhatsApp") |
| **Fluxo** | O que tentou fazer (ex: "Clicar em 'Conectar WhatsApp'") |
| **Esperado** | O que deveria acontecer |
| **Obtido** | O que realmente aconteceu |
| **Severidade** | 🔴 Crítico (impede uso) / 🟡 Médio (dificulta) / 🟢 Leve (incômodo) |
| **Evidência** | Screenshot ou descrição visual |

## Telas obrigatórias para testar

1. **Login / Cadastro**
2. **Dashboard / Home**
3. **Inbox (mensagens)**
4. **WhatsApp > Configurações**
5. **WhatsApp > Instâncias (adicionar/conectar)**
6. **WhatsApp > Disparos**
7. **CRM > Leads**
8. **CRM > Pipeline**
9. **Automações > Visual Builder**
10. **Configurações > Integrações**
11. **Configurações > Perfil / Tenant**
12. **Relatórios / Analytics**

## O que verificar em cada tela

- [ ] Botões respondem ao clique
- [ ] Formulários validam e enviam
- [ ] Estados de loading aparecem
- [ ] Estados de erro aparecem (amigáveis)
- [ ] Navegação funciona (voltar, menu, links)
- [ ] Mobile / responsivo (se aplicável)
- [ ] Textos fazem sentido (sem placeholders, sem "lorem ipsum")
- [ ] Cores e contraste ok
- [ ] Dados carregam (não ficam em loading infinito)

## Entregável

Arquivo `BUGS.md` na raiz do projeto com:
- Lista priorizada (críticos primeiro)
- Resumo executivo (quantos bugs, por severidade, por tela)
- Recomendação de ordem de correção

---

## ❓ Antes de começar, responda:

1. **Precisa de acesso ao sistema?** O projeto roda local com `npm run dev` — precisa que eu suba o servidor ou você consegue sozinho?
2. **Precisa de API Key / credencial de teste?** Se sim, qual?
3. **Prefere navegar no browser real ou analisar o código direto?** Caixa preta = navegar como usuário. Se não conseguir rodar, posso mudar para análise de código (caixa cinza/branca).

Aguardo confirmação para começar.
