# Importação de Leads — Padrão e Modelos

Este diretório contém a **planilha padrão** para importar leads no uPixel CRM
(tela **Importação de Leads** → `/import`, ou botão *Importar* dentro de um funil).

## Arquivos

| Arquivo | Uso |
|---|---|
| `modelo-importacao-leads.csv` | Modelo em CSV (cabeçalho + 2 linhas de exemplo). Use como base. |
| `modelo-importacao-leads.xlsx` | Mesmo modelo em Excel. |
| `leads-clinicas-odontologicas-LP-Express.csv` | 50 clínicas odontológicas já formatadas, prontas para importar no funil **Lp Express**. |
| `leads-clinicas-odontologicas-LP-Express.xlsx` | Mesma base em Excel. |

## Formato padrão

Primeira linha = **cabeçalho** (nomes das colunas). Uma linha por lead. Colunas do núcleo:

| Coluna | Obrigatório | Observação |
|---|---|---|
| **Nome** | ✅ Sim | Único campo obrigatório. Leads sem nome são ignorados. |
| **Telefone** | Não | Aceita `(11) 98888-7777`, `+55 11 98888-7777`, etc. Usado para deduplicar. |
| **Email** | Não | |
| **Empresa** | Não | |
| **Cidade** | Não | |
| **Cargo** | Não | |
| **Origem** | Não | Se vazio, entra como `Importação`. |
| **Tags** | Não | Várias tags separadas por ponto-e-vírgula: `VIP;Quente`. |

Colunas extras (ex.: `Estado`, `Instagram`, `Site`, `Observações`) **não se perdem**:
na tela de mapeamento elas aparecem como "colunas não mapeadas" e você pode criar
**campos personalizados** para elas em um clique — ou ignorá-las.

## Regras importantes

1. **O cabeçalho não precisa ser a primeira linha do arquivo.** O importador agora
   detecta automaticamente a linha de cabeçalho e ignora linhas de título/metadados
   acima dela (ex.: `"LISTA DE 50 CLÍNICAS..."`). Ainda assim, o ideal é que a
   planilha padrão comece direto pelo cabeçalho.
2. **Telefone duplicado é ignorado.** Se o telefone já existe na base do cliente, o
   lead não é reimportado (comparação normalizada para o padrão BR).
3. **Codificação UTF-8.** Acentuação é preservada (BOM incluído nos modelos).
4. Aceita `.csv`, `.xlsx` e `.xls`. A primeira aba é usada nos arquivos Excel.

## Como importar (passo a passo)

1. Abra **Importação de Leads** (`/import`) ou o botão *Importar* de um funil.
2. Envie o arquivo (arraste ou selecione).
3. Escolha o **Pipeline** = `Lp Express` e a **Etapa Inicial**.
4. Confira o **mapeamento** de colunas (os campos do núcleo são mapeados sozinhos).
5. Revise o **preview** e clique em **Importar Leads**.
