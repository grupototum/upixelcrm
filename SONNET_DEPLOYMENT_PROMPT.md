# Prompt para Claude Sonnet: Fix Deployment + Keep Latest Code Running

## Context

You are helping a production SaaS system (uPixel CRM) that has a multi-container architecture with:
- **nginx-totum**: reverse proxy (nginx in Docker)
- **upixel-api**: React SPA server (vite preview in Docker, port 3000)
- **totum-system**: another backend service
- **GitHub Actions**: CI/CD that builds and deploys

**Current Problems:**
1. **Deploys cause 5-10 min downtime (504 errors)** because upixel-api's CMD does `npm ci && npm run build && npm run preview` on every restart
2. **Container-to-container proxy doesn't work** - nginx-totum → upixel-api:3000 times out despite same Docker network
3. **Two different dist paths** cause code sync issues
4. **nginx reload fails** due to `host.docker.internal` not resolving in Linux Docker
5. **No guarantee latest code runs** - container may be stale or unhealthy

**User wants:**
- Deploys complete in ~30s with ZERO downtime
- Site ALWAYS runs the latest code from git `main` branch
- All *.upixel.app domains work via proxy to upixel-api
- Automated deploy via GitHub Actions sending pre-built dist

---

## Your Task: Fix and Automate

### **MANDATORY: Diagnose Before Fixing**

Before making changes, run these diagnostics on the VPS via SSH:

```bash
# Network diagnostics
docker inspect upixel-api --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' > /tmp/upixel_ip.txt
docker inspect nginx-totum --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' > /tmp/nginx_ip.txt
docker network inspect compose_totum --format '{{.Internal}}' > /tmp/network_internal.txt

# Connectivity test
docker exec nginx-totum wget -qO- --timeout=3 http://upixel-api:3000/ 2>&1 | head -5 > /tmp/proxy_test.txt

# Container status
docker ps -a --filter name=upixel --format "{{.Names}}\t{{.Status}}\t{{.Command}}" > /tmp/container_status.txt

# Current dist location and age
ls -la /docker/upixel/dist/ 2>&1 | head -5 > /tmp/dist_current.txt
ls -la /var/www/upixelcrm/dist/ 2>&1 | head -5 >> /tmp/dist_current.txt

# Check nginx config
docker exec nginx-totum cat /etc/nginx/nginx.conf | grep -A 5 "upixel_api_backend" > /tmp/nginx_upixel_config.txt
```

**Then:**
1. Review the output
2. Identify the root causes
3. Report findings before proceeding with fixes

---

### **PHASE 1: Fix Container Networking (If Needed)**

If proxy test failed, investigate and fix:

1. **Check network connectivity:**
   - Verify upixel-api and nginx-totum are on same network
   - If on different networks: connect them

2. **Check firewall rules:**
   - Look for iptables blocking port 3000
   - Temporarily disable if found, test, then add proper rule

3. **Verify docker-compose network:**
   - If `internal: true`, consider removing or using overlay network
   - Ensure containers can communicate

**Success criteria:** `docker exec nginx-totum wget -qO- http://upixel-api:3000/ 2>&1 | head -1` returns HTML

---

### **PHASE 2: Optimize upixel-api Container**

**Problem:** Every `docker restart upixel-api` triggers `npm ci && npm run build`, wasting 5-10 min.

**Solution (pick ONE):**

**Option A: Skip build, use pre-built dist** (RECOMMENDED)
- Change container CMD from `npm ci && npm run build && npm run preview` 
  to just `npm run preview`
- Ensure `/docker/upixel/dist` is mounted as `/app/dist` in docker-compose
- dist is pre-built by GitHub Actions, container just serves it

**Option B: Install only production deps**
- Change to `npm ci --prod && npm run preview`
- No dev deps, no build step
- Still requires dist pre-built

**Option C: Use lightweight static server**
- Replace vite preview with `npx serve -l 3000 dist/`
- Or use nginx inside the upixel-api container
- Minimal dependencies, instant start

**Implementation:**
1. Decide which option
2. Update docker-compose.yml or Dockerfile
3. Test restart: `docker restart upixel-api` should complete in <30 seconds

---

### **PHASE 3: Fix nginx Configuration**

**Issues to fix:**
1. `host.docker.internal` causes nginx reload to fail → use resolver pattern
2. Ensure proxy to upixel-api works
3. Ensure cache headers are correct for React SPA

**Do:**
```bash
# 1. Verify deploy/nginx.conf has resolver for evolution upstream
#    (should use "set $var" pattern to defer resolution)

# 2. Verify upixel.app server block proxies to upixel-api:3000
#    (already in deploy/nginx.conf from recent changes)

# 3. Test the config
docker exec nginx-totum nginx -t 2>&1

# 4. If test passes, reload
docker exec nginx-totum nginx -s reload 2>&1
```

**Success criteria:** `nginx -t` returns "test successful"

---

### **PHASE 4: Automate Deploy Verification**

Create a script that verifies the site ALWAYS runs latest code:

**Create `/docker/upixel/verify_deploy.sh`:**
```bash
#!/bin/bash
set -e

EXPECTED_SHA=$(cd /docker/upixel && git rev-parse origin/main)
RUNNING_BUNDLE=$(docker exec upixel-api cat /app/dist/assets/index-*.js 2>/dev/null | head -c 100)

echo "Expected commit: $EXPECTED_SHA"
echo "Running code: $(cd /docker/upixel && git rev-parse HEAD)"
echo "Bundle timestamp: $(stat -c '%y' /docker/upixel/dist/index.html)"

# Check age of dist files
DIST_AGE=$(($(date +%s) - $(stat -c '%Y' /docker/upixel/dist/index.html)))
if [ $DIST_AGE -gt 3600 ]; then
  echo "⚠️  WARNING: dist files are ${DIST_AGE}s old, may be stale"
  exit 1
fi

# Check if code is latest
CURRENT_SHA=$(cd /docker/upixel && git rev-parse HEAD)
if [ "$CURRENT_SHA" != "$EXPECTED_SHA" ]; then
  echo "❌ MISMATCH: running $CURRENT_SHA, expected $EXPECTED_SHA"
  exit 1
fi

echo "✅ Deploy verification passed"
```

**Add to crontab** (run every 5 minutes):
```
*/5 * * * * /docker/upixel/verify_deploy.sh 2>&1 | logger -t upixel-deploy-check
```

---

### **PHASE 5: Test Full Deploy Cycle**

**Manual test (on local machine):**

1. Make a small change to repo (e.g., add comment in App.tsx)
2. Commit and push to main
3. Monitor GitHub Actions (should complete in ~2 min)
4. Immediately curl the site: `curl https://master.upixel.app 2>/dev/null | grep "your comment" `
5. Verify no 504, no delay
6. Check: `docker inspect upixel-api --format='{{.State.Health.Status}}'` = healthy

**Success criteria:**
- ✅ Deploy completes in <60 seconds
- ✅ Zero 504 errors
- ✅ New code visible immediately
- ✅ Container stays healthy

---

### **PHASE 6: Document & Monitor**

**Update DEPLOYMENT_PLAN.md with actual findings:**
- Actual root cause of proxy timeout
- Which fix was applied (network, container, nginx)
- Current container CMD
- Any workarounds needed

**Create monitoring:**
```bash
# Check site health every 10 min
curl -s https://master.upixel.app -o /dev/null -w "%{http_code}\n" | \
  awk '{if($1 != 200) print "ALERT: HTTP " $1}' | logger -t upixel-health
```

---

## Success Criteria (All Must Pass)

- [ ] `docker exec nginx-totum wget -qO- http://upixel-api:3000/` returns HTML (no timeout)
- [ ] `docker exec nginx-totum nginx -t` passes without errors
- [ ] `docker restart upixel-api` completes in <30 seconds
- [ ] `curl https://master.upixel.app` returns 200 instantly
- [ ] Pushing code change → seeing it live in <60 seconds
- [ ] No 504 errors in production during deploy
- [ ] `docker logs upixel-api --tail 20` shows vite preview running, no errors
- [ ] `docker inspect upixel-api --format='{{.State.Health.Status}}'` = healthy
- [ ] Site serves latest git main branch (verified by bundle hash match)

---

## Deliverables

After completion, provide:

1. **Diagnostic report:** What was actually broken and why
2. **Changes made:** List of modifications to docker-compose, nginx.conf, deploy scripts, etc.
3. **Verification commands:** How to verify each part works
4. **Monitoring setup:** Commands to monitor and alert on issues
5. **Updated DEPLOYMENT_PLAN.md** with lessons learned

---

## Notes

- **Do not assume** container networking works - TEST first
- **Do not skip** the `docker exec nginx-totum nginx -t` test - config syntax matters
- **Do prioritize** speed over complexity - prefer simple fixes
- **Always test locally** before declaring success - actual curl + browser
- **Document everything** for the user so they understand what was fixed
