# Garap — Runbook Go-Live (publik & komersial)

> Semua kode/fondasi sudah live di `garap.arahkarya.com`. Dokumen ini = langkah EKSTERNAL
> yang hanya bisa kamu (owner) lakukan, dengan nilai konkret siap-tempel. Urut sesuai prioritas.
> Setelah tiap langkah, kabari assistant untuk lanjut bagian teknis yang menyusul.

---

## LANGKAH 1 — Google OAuth Console (5 menit, GRATIS) — **paling mendesak**

Tanpa ini, login Google di `garap.arahkarya.com` ditolak (origin domain lama). Ini memblokir SEMUA login user baru.

1. Buka https://console.cloud.google.com/apis/credentials
2. Pilih project yang punya OAuth Client ID:
   `528362774225-9q81b5atjq6stlogld2f327evn9s2vrh.apps.googleusercontent.com`
3. Klik OAuth 2.0 Client ID itu (tipe **Web application**).
4. **Authorized JavaScript origins** → Add URI:
   ```
   https://garap.arahkarya.com
   ```
5. **Authorized redirect URIs** → Add URI:
   ```
   https://garap.arahkarya.com/api/auth/google/callback
   ```
6. (Boleh hapus entri lama `garap.arahkarya.com` setelah yakin.)
7. **Save**. Propagasi 5 menit–beberapa jam.
8. **OAuth consent screen** → pastikan **Publishing status = In production** (bukan Testing),
   else hanya test-user yang bisa login. Jika masih "Testing", klik **Publish app**.
   (Untuk scope email/profile dasar, biasanya tak perlu verifikasi Google.)

→ **Kabari assistant** → uji login Google end-to-end + rotasi secret yang sempat bocor.

---

## LANGKAH 2 — Buka pendaftaran publik (setelah Langkah 1 OK)

Saat ini `PUBLIC_SIGNUP=false` (hanya `ALLOWED_EMAILS`). Untuk membuka:

```bash
# di /home/yay/ArahKarya/Garap/.env
PUBLIC_SIGNUP=true
```
Lalu redeploy: `./deploy.sh app`. Verifikasi: buka di incognito → coba login Google
dengan akun lain → harus berhasil & dapat role MEMBER + paket FREE.

**JANGAN buka ini sebelum** kamu nyaman dengan: (a) kuota Free sudah aktif (sudah ✅),
(b) infra cukup (lihat Langkah 4) bila ekspektasi banyak user, (c) ToS/Privacy sudah kamu review.

---

## LANGKAH 3 — Payment provider (komersialisasi)

Fondasi sudah ada (model `Subscription`, plan FREE/PRO, `/api/billing/*`, halaman Paket).
Tinggal pasang provider. Pilih satu:

| Provider | Cocok untuk | Catatan |
|---|---|---|
| **Midtrans / Xendit** | Pasar **Indonesia** (QRIS, VA, e-wallet, kartu) | Rekomendasi untuk user lokal. Settlement Rupiah. Perlu PT + verifikasi. |
| **LemonSqueezy / Paddle** | Pasar **global** | Merchant-of-Record → mereka urus pajak/VAT global. Paling simpel legal, fee lebih tinggi. |
| **Stripe** | Global, fleksibel | Belum support entity Indonesia langsung untuk semua fitur; cek ketersediaan. |

**Untuk target user Indonesia → Midtrans atau Xendit.**

Yang assistant kerjakan begitu kamu kasih **API key (sandbox/test dulu)**:
- Adapter provider di seam yang sudah ada (`Subscription.provider/providerCustomerId/...`).
- Endpoint `POST /api/billing/checkout` (buat sesi bayar) + halaman redirect.
- `POST /api/billing/webhook` (verifikasi signature → set `status=ACTIVE`, `planKey=PRO`, `currentPeriodEnd`).
- Aktifkan tombol "Upgrade ke Pro" di halaman Paket.
- Dunning sederhana: webhook gagal-bayar → `status=PAST_DUE` → kuota turun ke FREE.

→ **Kabari assistant + kasih test API key** → dibangun + diuji pakai sandbox.

---

## LANGKAH 4 — Infra produksi (untuk "banyak user")

1 RPi5 = single point of failure + tak scale. Untuk publik beneran:

**Rekomendasi minimum (hemat, cukup untuk ratusan user awal):**
- 1 VPS (mis. 2 vCPU / 4 GB — Hetzner/Contabo/IDCloudHost/Biznet) untuk app+worker.
- **Managed PostgreSQL** (mis. Neon/Supabase/RDS) — JANGAN DB di disk VPS yang sama.
- **Managed Redis** (Upstash) atau Redis di VPS (queue saja, tak kritikal data).
- **Object storage** (Cloudflare R2 / S3) untuk upload — pindah dari disk lokal.
- Cloudflare Tunnel tetap bisa dipakai dari VPS, atau langsung A record + TLS.

**Yang assistant kerjakan begitu kamu sediakan VPS + DB URL + R2 creds:**
- `docker-compose.prod.yml`: app+worker saja (postgres/redis eksternal).
- Migrasi data RPi5 → managed Postgres (pg_dump/restore, sudah ada pola backup).
- Ganti storage dokumen lokal → adapter S3/R2 (kode upload sudah terisolasi).
- Health check + restart policy + (opsional) 2 instance app di belakang LB.

→ **Kabari assistant + kasih: IP VPS / DATABASE_URL managed / R2 creds** → migrasi dikerjakan.

---

## LANGKAH 5 — Rotasi secret (setelah Langkah 1, supaya tak terkunci)

Secret sempat masuk git history (`.env.bak.panggon`, sudah dihapus dari HEAD).
Karena mau go-public, rotasi: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `POSTGRES_PASSWORD`,
`SEED_ADMIN_PASSWORD` (assistant bisa otomatis), `GOOGLE_CLIENT_SECRET` (manual di Console).
Dilakukan SETELAH login Google jalan, supaya kamu tak terkunci saat sesi ke-reset.

---

## Checklist pra-launch

- [ ] Langkah 1 (OAuth) selesai + login Google diuji
- [ ] Secret dirotasi (Langkah 5)
- [ ] Akun super-admin nyasar `admin@garap.local` dihapus/diganti
- [ ] Provider pembayaran terpasang + diuji sandbox (Langkah 3)
- [ ] Infra produksi siap (Langkah 4) bila target banyak user
- [ ] ToS & Privacy direview profesional (saat ini template)
- [ ] `PUBLIC_SIGNUP=true` (Langkah 2) — **paling akhir**
- [ ] Monitoring (Sentry/uptime) aktif
- [ ] Backup otomatis terjadwal + uji restore
