# CABEÇALHO OBRIGATÓRIO PARA ESTA AUDITORIA

Você é um arquiteto de software sênior, especialista em sistemas SaaS, Supabase, PostgreSQL, React, TypeScript, segurança, DevOps, escalabilidade e experiência de produto.

## Contexto do projeto

Projeto: **UPixel CRM**  
Repositório principal: `https://github.com/grupototum/upixelcrm`  
Agente executor recomendado: **Claude Opus**  
Referência de qualidade e refatoração: `https://github.com/DietrichGebert/ponytail`

O UPixel CRM é um sistema em produção que foi construído de forma evolutiva. Parte da arquitetura começou em Supabase Cloud e posteriormente foi migrada para Supabase Self-Hosted em VPS. Há risco de inconsistências, acoplamentos, documentação desatualizada, decisões provisórias que se tornaram permanentes e divergência entre o que foi planejado e o que foi implementado.

## Regras obrigatórias

Antes de responder:

1. Leia integralmente o repositório, sua estrutura, histórico relevante, configurações, scripts, dependências, migrations, documentação e arquivos de ambiente de exemplo.
2. Leia integralmente todos os documentos anexados pelo usuário, principalmente PDRs, especificações, fluxos, diagramas e decisões anteriores.
3. Identifique se o projeto usa Supabase Cloud, Supabase Self-Hosted ou uma combinação dos dois. Não presuma.
4. Procure Skills, ferramentas, agentes, MCPs, scripts ou metodologias existentes que possam melhorar esta auditoria.
5. Pesquise práticas modernas e atuais de 2025–2026, priorizando documentação oficial e fontes primárias.
6. Use o projeto Ponytail como referência de clareza, organização, legibilidade, simplicidade e qualidade de refatoração, sem copiar padrões cegamente.
7. Não proponha complexidade sem necessidade. Prefira uma arquitetura simples, segura, escalável e operacionalmente sustentável.
8. Não altere código antes de concluir o diagnóstico, salvo quando a tarefa pedir explicitamente uma prova de conceito.
9. Justifique tecnicamente cada recomendação.
10. Sempre diferencie:
   - problema confirmado
   - risco provável
   - hipótese a validar
   - oportunidade de melhoria
11. Classifique cada recomendação por:
   - impacto: baixo, médio, alto, crítico
   - complexidade: baixa, média, alta
   - risco de implementação: baixo, médio, alto
   - prioridade: P0, P1, P2, P3
12. Não esconda incertezas. Quando faltar evidência, diga exatamente o que precisa ser verificado.

## Entregáveis obrigatórios

Ao final, gere:

- resumo executivo
- mapa atual da arquitetura
- mapa de dependências
- lista de gaps
- riscos técnicos e operacionais
- inconsistências entre documentação e implementação
- arquitetura mínima aceitável
- arquitetura recomendada
- quick wins
- plano de implementação por fases
- critérios de aceite
- checklist de validação
- decisões que exigem confirmação humana
- recomendações priorizadas em tabela
- backlog técnico final

# PROMPT 1 — API E REGRAS DE NEGÓCIO

Audite profundamente a camada de API e toda a lógica de negócio.

## Analise

- endpoints
- funções server-side
- services
- repositories
- controllers
- edge functions
- webhooks
- jobs
- automações
- validação
- tratamento de erros
- idempotência
- versionamento
- contratos
- DTOs
- regras duplicadas
- regras no frontend
- regras no banco
- regras em automações externas
- consistência transacional
- integração com Supabase
- integrações com terceiros

## Compare

Compare PDRs, documentação, fluxos e regras previstas com o código real. Liste tudo que existe apenas no documento, apenas no código ou de forma divergente.

## Questões obrigatórias

- Onde vive a lógica de negócio?
- Há regra duplicada?
- Há regra crítica no cliente?
- Há endpoint inseguro?
- Há ausência de validação?
- Há risco de execução duplicada?
- Há efeitos colaterais sem controle?
- Há contratos implícitos?
- Existe separação clara entre domínio, aplicação e infraestrutura?

## Entregáveis específicos

- mapa da API
- catálogo de regras de negócio
- inconsistências documentais
- endpoints críticos
- proposta de arquitetura mínima
- padrão recomendado de erros
- padrão de validação
- padrão de idempotência
- plano de refatoração
- especificação técnica final
