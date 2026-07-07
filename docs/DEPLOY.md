# Deployment — Garap

App live di **https://garap.arahkarya.com** lewat Cloudflare Tunnel (bukan
nginx + DNS proxy). RPi5 tidak butuh public IP / port forward — `cloudflared`
buka outbound QUIC ke Cloudflare, lalu Cloudflare route hostname ke tunnel.

```
Browser
  ↓ HTTPS (TLS termination di Cloudflare edge)
Cloudflare edge
  ↓ Cloudflare Tunnel (cloudflared QUIC outbound, 4 koneksi)
RPi5 cloudflared process (config: ~/.cloudflared/config-arahkarya.yml)
  ↓ ingress rule match by hostname
127.0.0.1:3007 → garap-app container
```

## Stack

| Komponen | Port | Container | Status |
|---|---|---|---|
| Postgres 16 | host 5439 → 5432 | `garap-postgres-1` | docker compose service |
| Redis 7 | host 6380 → 6379 | `garap-redis-1` | docker compose service |
| App (Express + SPA) | host 3007 → 3007 | `garap-app-1` | docker compose service |
| BullMQ Worker | shared image | `garap-worker-1` | docker compose service |
| Cloudflare Tunnel | (no port) | host process `cloudflared` | systemd unit `cloudflared.service` (atau nohup) |

## First-time deploy

1. **DNS** — di Cloudflare dashboard, zone `arahkarya.com`:
   - Type: `CNAME`
   - Name: `garap`
   - Target: `<arahkarya-tunnel-uuid>.cfargotunnel.com` (UUID = `c2aca48a-…` untuk tunnel `arahkarya`)
   - Proxy: **Proxied (orange)**

   Atau gunakan `cloudflared tunnel route dns arahkarya garap.arahkarya.com`
   kalau cert.pem cloudflared sudah bound ke akun yang punya zona arahkarya.com.

2. **Tunnel ingress** — edit `~/.cloudflared/config-arahkarya.yml`, tambah:

   ```yaml
   ingress:
     # … rules existing …
     - hostname: garap.arahkarya.com
       service: http://127.0.0.1:3007
     - service: http_status:404   # catch-all wajib di akhir
   ```

   Restart tunnel: `pkill -f "cloudflared.*config-arahkarya" && nohup cloudflared tunnel --config ~/.cloudflared/config-arahkarya.yml run arahkarya > /tmp/cloudflared-arahkarya.log 2>&1 & disown`

3. **App** — di repo `/home/arah/apps/garap`:

   ```bash
   cp .env.docker.example .env
   nano .env
   # isi: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET (openssl rand -base64 48),
   #      GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ALLOWED_EMAILS
   #      APP_URL=https://garap.arahkarya.com
   #      CORS_ORIGIN=https://garap.arahkarya.com

   ./deploy.sh   # build + up + migrate + seed
   ```

## Health check

```bash
curl https://garap.arahkarya.com/api/health
# → {"success":true,"data":{"status":"healthy","checks":{"db":"ok","redis":"ok"}}}
```

## Update / redeploy

```bash
git pull
./deploy.sh app   # rebuild app+worker only, postgres/redis tetap jalan
```

## Login

- Login email/password (satu-satunya jalur): form di `/login`. Saat
  `PUBLIC_SIGNUP=false`, hanya email di `ALLOWED_EMAILS` yang boleh mendaftar.
- Admin awal di-seed dari `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`; rotate via
  `/settings` → ganti password.

> **Google OAuth dihapus total (2026-07-07)** — tak ada lagi setup Google Cloud Console.

## Backup

- DB dump otomatis: `scripts/backup-db.sh` (cron-able)
- App data export JSON: tombol "Unduh Backup JSON" di `/settings`
- Tunnel + cloudflared config: backup `~/.cloudflared/`

## Troubleshooting

- **Public 404 dari Cloudflare** — biasanya hostname belum ada di tunnel
  ingress. Cek `cat ~/.cloudflared/config-arahkarya.yml` dan restart tunnel.
- **Public works tapi nginx log kosong** — itu **normal**, tunnel bypass
  nginx. nginx di RPi5 cuma untuk LAN/localhost.
- **Container restart loop** — `docker compose logs app --tail 50`. Sering
  karena Prisma binary target mismatch (RPi5 alpine pakai openssl-3.0.x).
- **bcrypt build gagal di RPi5 ARM64** — pakai bcryptjs (sudah di repo).
