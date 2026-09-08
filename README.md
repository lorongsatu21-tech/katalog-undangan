# LORONGSATU21 Online

Aplikasi katalog + admin dengan **data bersama di server**.

- Produk, harga, kategori, pesanan, desain/ACC, pelanggan, laporan: tersimpan di `data/db.json` (satu sumber untuk semua pengunjung).
- Keranjang, favorit, bandingkan: tetap di perangkat masing-masing.
- Login admin lewat API (`ADMIN_USER` / `ADMIN_PASS`).

## Jalankan di komputer

```bash
cd LORONGSATU21-online
npm install
npm start
```

Buka http://localhost:3000

Admin: `admin` / `lorongsatu21` (ganti lewat environment di produksi).

## Pasang online (data bersama)

Pilih salah satu hosting yang menjalankan Node.js:

### Render (disarankan, gratis)

1. Push folder ini ke GitHub.
2. Buka https://render.com → New Web Service → pilih repo.
3. Build: `npm install` · Start: `node server.js`
4. Environment:
   - `ADMIN_USER` = admin
   - `ADMIN_PASS` = password baru
   - `TOKEN_SECRET` = string acak
5. Dapat URL `https://nama-anda.onrender.com`

Catatan paket gratis Render: server tidur jika sepi, data file bisa hilang saat deploy ulang. Untuk toko sungguhan, pasang disk persisten atau pindah ke PostgreSQL.

### Railway

New Project → Deploy from GitHub → start `node server.js`.

### VPS (Nginx + Node)

```bash
npm install
PORT=3000 ADMIN_PASS=rahasia node server.js
```

Arahkan domain ke port 3000 (proxy Nginx).

## API

- `GET /api/db` — data toko
- `POST /api/login`
- `PUT /api/db` — simpan (admin)
- `POST /api/orders` — checkout pelanggan
- `PATCH /api/orders/:id` — status / ACC
- `POST /api/upload` — foto (admin)
- `GET /api/health`

## Bukan localStorage toko

Versi statis sebelumnya hanya menyimpan di browser. Versi ini yang dimaksud “online”: admin di laptop dan pelanggan di HP melihat katalog serta pesanan yang sama.
