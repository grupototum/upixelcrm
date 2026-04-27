# Plano de Ação: Deploy Zero-Downtime + Sempre Última Versão

## Estado Atual (Problemas Identificados)

### 1. **Downtime durante deploy** (5-10 min)
- `upixel-api` CMD: `npm ci && npm run build && npm run preview` roda a CADA restart
- Cada push pra main → GitHub Actions → SSH deploy → docker restart → rebuild → 504

### 2. **Conectividade entre containers**
- nginx-totum e upixel-api estão em `compose_totum` mas wget/proxy timeout
- Provável: network `internal: true` ou iptables rule
- Impede proxy *.upixel.app → upixel-api:3000

### 3. **Dois caminhos de dist**
- Container builda em `/docker/upixel/dist` (volume mounted)
- nginx servia de `/var/www/upixelcrm/dist` (volume mount diferente)
- Código novo nunca chegava ao ar

### 4. **nginx config issues**
- `host.docker.internal` não resolve em Linux Docker → reload falha
- Evolution API proxy quebrada (upstream: host.docker.internal:47398)

### 5. **Sem garantia de código atualizado**
- Mesmo após git pull/reset, container aged/unhealthy
- Sem verificação se site roda a versão correta

---

## Solução Integrada

### **Fase 1: Diagnóstico + Fix de Rede** (10-15 min)
- [ ] Confirmar IP do upixel-api em compose_totum
- [ ] Testar conectividade nginx-totum → upixel-api via IP
- [ ] Verificar se network é `internal: true`
- [ ] Verificar iptables rules
- [ ] Se necessário: reconectar upixel-api à network ou usar host mode

### **Fase 2: Otimizar Container** (5 min)
- [ ] Mudar CMD do upixel-api para NÃO fazer rebuild se dist já existe
  - Opção A: apenas `npm run preview` (dist é volume pre-built)
  - Opção B: usar `npm ci --prod && npm run preview` (skip dev deps, skip build)
  - Opção C: substituir por simples static server (serve dist, ou nginx inside container)
- [ ] Garantir dist montado como volume: `/docker/upixel/dist:/app/dist`
- [ ] Garantir healthcheck correto na porta 3000

### **Fase 3: Fix nginx config** (5 min)
- [ ] Implementar resolver pattern para evolution.grupototum.com
- [ ] Testar reload: `docker exec nginx-totum nginx -t && docker exec nginx-totum nginx -s reload`
- [ ] Validar proxy upixel.app → upixel-api:3000 funciona

### **Fase 4: Deploy automático de baixa-latência** (Implementado)
- [x] GitHub Actions build job (compila em CI)
- [x] SCP artifact para /tmp/upixel-extract
- [x] deploy.sh atomic swap em /docker/upixel/dist
- [x] nginx reload (instantâneo, sem downtime)
- [ ] Verificar que dist novo é servido (curl + grep bundle hash)

### **Fase 5: Garantir código sempre atualizado** (5 min)
- [ ] Script cron ou GitHub webhook que verifica:
  - `curl master.upixel.app` + grep bundle hash
  - Comparar com `cat /docker/upixel/dist/assets/index-*.js | md5sum`
  - Alert se diferente (código desatualizado)
- [ ] Alternativa: startup.sh que compara git HEAD com running version

### **Fase 6: Testes end-to-end** (10 min)
- [ ] Push dummy change pra main → verifica deploy completo em <60s
- [ ] Verifica se site roda código novo (sem 504, sem delay)
- [ ] Valida todos os dominios: upixel.app, master.upixel.app, totum.upixel.app, evolution.grupototum.com
- [ ] Monitora saúde: `docker inspect upixel-api --format='{{.State.Health.Status}}'` deve ser healthy

---

## Resultado Esperado

✅ **Deploy automático:** Push → 30 segundos → site com código novo, ZERO downtime  
✅ **Sempre versão latest:** Garantia que site roda main branch  
✅ **Proxy funcional:** *.upixel.app → upixel-api sem timeout  
✅ **nginx reload rápido:** Não falha com host.docker.internal  
✅ **Container otimizado:** Restart = recarregar dist (segundos, não minutos)

---

## Comandos de Verificação Pós-Deploy

```bash
# 1. Site online e respondendo?
curl -I https://master.upixel.app 2>/dev/null | head -3

# 2. Bundle hash correto?
curl -s https://master.upixel.app | grep -o 'index-[a-zA-Z0-9]*\.js' | head -1

# 3. Container saudável?
docker inspect upixel-api --format='{{.State.Health.Status}} (uptime: {{.State.StartedAt}})'

# 4. Qual código está rodando?
cd /docker/upixel && git rev-parse HEAD && git log -1 --pretty=%s

# 5. Última atualização do site?
stat -c '%y' /docker/upixel/dist/index.html
```

---

## Próximos Passos (Imediato)

1. Rodar diagnostico de rede (wget, IPs, iptables)
2. Fix conectividade container
3. Otimizar CMD do upixel-api (skip rebuild)
4. Test deploy end-to-end
5. Implementar health check/monitoring
