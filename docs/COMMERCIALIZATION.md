# Garap → SaaS Publik & Komersial — Roadmap

> Status dokumen: **draft v1 (2026-06-04)**. Garap saat ini = app solo-user yang kokoh
> (RBAC, audit log, validasi Zod, soft-delete). Untuk go-public & komersial perlu redesign
> fundamental di auth, tenancy, storage, billing, dan ops. Estimasi realistis: **3–4 bulan**
> ke MVP komersial yang aman, tergantung model tenancy yang dipilih (lihat §1).

---

## 0. KEPUTUSAN ARSITEKTUR (tentukan dulu — menentukan berbulan-bulan kerja)

**Model tenancy:**

- **Opsi A — Akun Individual (B2C)** *(rekomendasi untuk MVP)*
  Tiap user = data sendiri, tanpa tim. Model `ownerId` sekarang sudah mendukung ini.
  Yang perlu: buka signup publik, matikan auto-SUPER_ADMIN, kuota per-user, billing.
  → **tercepat ke revenue, risiko rendah.** ~4–6 minggu.

- **Opsi B — Tim/Organisasi (B2B)**
  Organization punya banyak member yang berbagi workspace. Perlu redesign besar:
  model `Organization`, migrasi `ownerId`→`organizationId`, membership + role + invite.
  → powerful tapi ~3+ bulan sebelum launch.

**Rekomendasi:** Launch **Opsi A** dulu (MVP B2C), tambah tim (Opsi B) belakangan sebagai
upgrade berbayar kalau ada permintaan. Hindari refactor Organization berbulan-bulan sebelum
ada pengguna bayar pertama.

---

## 1. PHASE 0 — Keamanan & Hygiene (segera, hari ini–minggu ini)

- [x] Hapus `.env.bak.panggon` dari repo + perkuat `.gitignore` (DONE 2026-06-04)
- [ ] **Rotasi semua secret** yang sempat masuk git history: `JWT_ACCESS_SECRET`,
      `JWT_REFRESH_SECRET`, `POSTGRES_PASSWORD`, `SEED_ADMIN_PASSWORD` (bisa otomatis),
      `GOOGLE_CLIENT_SECRET` (manual di Google Cloud Console).
- [ ] Rate limit per-endpoint: upload dokumen (ketat), search, bulk ops.
- [ ] Error tracking (Sentry) + uptime monitor.

## 2. PHASE 1 — Auth untuk Publik (BLOCKER)

- [ ] Buang allowlist `ALLOWED_EMAILS` → **self-signup publik**.
- [ ] **Matikan auto-SUPER_ADMIN** di `auth/google.service.ts` — user baru = role `USER`.
      (Sekarang setiap signup baru jadi super-admin = bencana multi-user.)
- [ ] Email verification saat signup (perlu email transaksional — Resend/SMTP).
- [ ] "Lupa password" flow (saat ini cuma change-password butuh password lama).
- [ ] Login Google: daftarkan domain `garap.arahkarya.com` di Google Cloud Console
      (Authorized JS origins + redirect URI).

## 3. PHASE 2 — Isolasi Data / Tenancy (BLOCKER)

- [ ] Audit IDOR: pastikan SETIAP query Prisma ter-scope ke pemilik. Khusus
      `/api/users/*` sekarang **global** (bisa baca/hapus semua user) — wajib di-scope.
- [ ] Server **enforce** `workspaceId`/owner dari token, jangan percaya `req.body`.
- [ ] (Jika Opsi B) model `Organization` + `UserOrganizationRole` + migrasi data.
- [ ] Redefinisi `SUPER_ADMIN`: jadi admin dalam tenant, bukan global.

## 4. PHASE 3 — Object Storage + Kuota

- [ ] Pindah upload dokumen dari disk lokal RPi5 → S3/Cloudflare R2/GCS.
- [ ] Tracking kuota disk per user/tenant + enforcement.

## 5. PHASE 4 — Billing & Langganan (revenue)

- [ ] Desain plan (Free / Pro / dst) + kuota tiap tier (seats, storage, item limit).
- [ ] Integrasi payment: Stripe / Paddle / Lemonsqueezy (Paddle/LS = merchant-of-record,
      enak untuk pajak global; Stripe paling fleksibel).
- [ ] Model `Subscription` + `Payment` + webhook + dunning (gagal bayar, cancel, downgrade).
- [ ] Enforcement kuota di endpoint kunci.

## 6. PHASE 5 — Skalabilitas & Ops (BLOCKER untuk "banyak user")

- [ ] Keluar dari single RPi5 (SPOF) → VPS/cloud: app ≥2 instance di belakang LB,
      **managed PostgreSQL** + **managed Redis**, bukan container lokal.
- [ ] Backup otomatis terenkripsi ke cloud (Restic/Backblaze) + uji restore berkala.
- [ ] Migrasi DB: pola migrate-before-deploy + rollback.
- [ ] Logging terpusat + alert.

## 7. PHASE 6 — Legal & Compliance

- [ ] Terms of Service + Privacy Policy.
- [ ] Penanganan data pribadi (hak hapus/ekspor — sebagian sudah ada via backup/trash).
- [ ] Kepatuhan pembayaran (PCI via processor), pajak (PPN/MoR), invoice.

---

## Catatan Risiko Utama (dari audit 2026-06-04)

- **JANGAN launch sebelum** isolasi tenant + auth redesign beres — risiko IDOR & kebocoran
  data lintas user (kritis).
- Single RPi5 tidak layak produksi "banyak user" — wajib pindah infra.
- Storage upload lokal = SPOF + tak ter-backup otomatis.
- Billing = porsi paling lama & paling kritis (revenue) — desain matang dari awal.
