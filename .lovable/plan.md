

## Adicionar ícone light ao PWA manifest

### O que será feito

Copiar `src/assets/upixel_icon_light.png` para `public/icon-light-192.png` e `public/icon-light-512.png`, e adicionar essas entradas no `manifest.json` para que dispositivos com tema claro usem o ícone alternativo.

### Alterações

1. **Copiar asset light para public/**
   - `cp src/assets/upixel_icon_light.png public/icon-light-192.png`
   - `cp src/assets/upixel_icon_light.png public/icon-light-512.png`

2. **Atualizar `public/manifest.json`** — adicionar os ícones light ao array `icons`:
   ```json
   {
     "src": "/icon-light-192.png",
     "sizes": "192x192",
     "type": "image/png",
     "purpose": "any"
   },
   {
     "src": "/icon-light-512.png",
     "sizes": "512x512",
     "type": "image/png",
     "purpose": "any"
   }
   ```

3. **Atualizar `index.html`** — adicionar `<link rel="apple-touch-icon" href="/icon-light-192.png" media="(prefers-color-scheme: light)">` para que dispositivos Apple com tema claro usem o ícone correto.

### Nota técnica
O Web App Manifest não suporta nativamente `media` queries nos ícones (diferente do `<link>`), então o navegador escolherá o ícone mais adequado automaticamente. A separação via `purpose` ("any" vs "maskable") e os `<link>` tags no HTML com `media="(prefers-color-scheme)"` garantem a melhor cobertura possível.

