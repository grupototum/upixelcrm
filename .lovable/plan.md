

## Plano: Usar ícone uPixel na LoginPage por tema

### O que será feito
Substituir o ícone de cadeado (`Lock`) na tela de login pelo logo ícone da uPixel, alternando entre `upixel_icon_light` (modo claro) e `upixel_icon_dark` (modo escuro).

### Alteração

**Arquivo:** `src/pages/LoginPage.tsx`

1. Importar `useTheme` de `@/lib/theme`
2. Importar `upixelIconLight` e `upixelIconDark` dos assets
3. Substituir o bloco do ícone Lock (linha 42-44) por uma tag `<img>` que alterna a source conforme o tema atual
4. Remover import do `Lock` (se não usado em outro lugar)

