

# Plano: Adicionar Alexandria ao Menu Lateral

## Problema
A página Alexandria RAG existe na rota `/alexandria/rag`, mas não há nenhum item de navegação no sidebar (`AppSidebar.tsx`) apontando para ela. O usuário não consegue encontrá-la.

## Solução
Adicionar um item "Alexandria" no array `navItems` do `AppSidebar.tsx`, posicionado após "Inteligência" (faz sentido contextualmente).

## Alteração

**Arquivo:** `src/components/layout/AppSidebar.tsx`

- Importar o ícone `BookOpen` do lucide-react
- Adicionar ao array `navItems`:
  ```
  { title: "Alexandria", url: "/alexandria/rag", icon: BookOpen }
  ```
- Posicionar após "Inteligência" e antes de "Campanhas"

Apenas 1 arquivo modificado, ~2 linhas de código.

