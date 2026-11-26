# CODE ADVENTURE

Game edukasi pemrograman dasar berbasis browser dengan **Google Blockly** + **Phaser 3**. Siswa menyusun blok, menjalankan program, dan membantu robot Kiko menyelesaikan 10 misi. Semua materi, instruksi, umpan balik, dan laporan menggunakan **Bahasa Indonesia**.

Aplikasi **tanpa backend berbayar**, bekerja offline setelah diinstal, dan menyimpan progres di perangkat (IndexedDB dengan fallback localStorage). Interpreter blok ditulis sendiri dengan generator JavaScript dan **tidak menggunakan `eval()`**.

---

## 1. Menjalankan aplikasi

### Opsi A — langsung dibuka (tanpa server)

Buka `index.html` di browser Chromium (Chrome/Edge/Chromebook). Seluruh dependency sudah dibundling di folder `vendor/`, sehingga tidak perlu internet.

> Catatan: mode PWA/service worker hanya aktif pada alamat `http(s)://`. Jika dibuka lewat `file://`, aplikasi tetap berjalan, tetapi install prompt dan offline caching service worker tidak tersedia.

### Opsi B — server lokal (disarankan untuk PWA)

```powershell
python -m http.server 8123 --bind 127.0.0.1
```

Lalu buka:

```
http://127.0.0.1:8123/index.html
```

Setelah halaman dimuat, service worker `sw.js` menyimpan semua aset inti ke Cache Storage. Aplikasi kemudian bisa dipakai tanpa koneksi dan dapat diinstal lewat menu browser **Install App / Add to Home Screen**.

---

## 2. Fitur utama

- **Editor blok** dengan kategori: Gerak, Kontrol, Logika, Angka, Variabel, Fungsi, Event, Sensor, dan Semua Blok.
- Toolbox dibatasi per level agar siswa fokus pada konsep yang sedang dipelajari.
- Kontrol penuh: **RUN**, **STOP**, **RESET**, **STEP**, **UNDO**, **REDO**, **PREVIEW**, **REPLAY**, **HINT**.
- Blok yang sedang dijalankan disorot; panel debugging menampilkan hubungan blok → gerakan.
- Eksekusi berurutan, deterministik, dibatasi maksimal 4000 langkah untuk mencegah infinite loop.
- Sistem penilaian: bintang 1–3, XP, level/rank, achievement, dan metrik efisiensi/percobaan/debug/loop/function (bukan kecepatan).
- Setelan dibagi: siswa hanya bisa mengubah suara/kecepatan; PIN guru, profil, impor, dan hapus data dikunci dengan PIN.
- Dashboard siswa: progres 10 level, kompetensi, badge, riwayat, papan peringkat lokal, pengelolaan profil.
- Dashboard guru: kelas + kode kelas, siswa, Teacher Challenge, tabel progres, error umum, penggunaan blok, ekspor CSV/Excel/JSON, impor JSON.
- Mode tambahan: Sandbox, Daily Challenge, batas blok (Challenge Mode), Code Preview, Solution Replay.
- Responsif untuk laptop, Chromebook, tablet, dan HP. Tombol RUN mobile dan toggle toolbox tersedia di layar sempit.
- PWA installable + offline setelah cache service worker selesai.

---

## 3. Daftar level

| # | Judul | Konsep |
|---|-------|--------|
| 1 | Gerakkan Robot | Urutan perintah, arah hadap |
| 2 | Kumpulkan Koin | Sequence, perencanaan |
| 3 | Hindari Rintangan | Jump, debugging dasar |
| 4 | Gerakan Berulang | Loop `Repeat` |
| 5 | Pintu Otomatis | `If` + sensor pintu |
| 6 | Labirin Kode | Kombinasi loop & kondisi |
| 7 | Energi Variabel | Variabel, perbandingan, event |
| 8 | Fungsi Langkah | Function + decomposition |
| 9 | Debugging Hero | Trace program dengan STEP |
| 10 | Final Project | Integrasi koin, energi, tombol, pintu, fungsi |

Setiap level memuat cerita, tujuan pembelajaran, materi singkat, contoh, tantangan, petunjuk bertahap, syarat menang, dan umpan balik.

---

## 4. Mode Guru

1. Buka navigasi **👩‍🏫 Guru**.
2. Masukkan PIN guru. Default: **1234** (dapat diubah di menu **Setelan → Setelan Guru** setelah memasukkan PIN).
3. Buat kelas → sistem membuat kode kelas 6 karakter.
4. Tambah siswa lewat tombol **+ Siswa** atau **+ Siswa aktif**.
5. Buat **Teacher Challenge** berdasarkan level existing dengan batas blok tertentu; tombol **Mainkan** memuat tantangan tersebut ke editor siswa.
6. Gunakan tombol ekspor untuk CSV, Excel (`.xls`), atau JSON. Impor JSON tersedia dengan opsi **Timpa** atau **Gabungkan**.

Mode guru tidak mengganti profil siswa aktif saat menambah siswa baru.

---

## 5. Struktur proyek

```text
index.html                 Semua layar UI + urutan script
manifest.webmanifest       Metadata PWA
sw.js                      Service worker (cache-first, offline)
assets/                    Ikon aplikasi
vendor/
  phaser/                  Phaser 3.90.0 (lokal)
  blockly/                 Blockly 13.5.0 + pesan Bahasa Indonesia + media
src/
  core/                    util, storage, audio, scoring
  game/                    levels, world (grid deterministik), scene (Phaser)
  blocks/                  definisi blok + toolbox per level
  engine/interpreter.js    Generator tanpa eval
  ui/                      app, teacher, pseudocode, export
tests/run.js               Test otomatis tanpa dependency
tools/make-icons.js        Generator ikon PWA
```

Arsitektur memakai classic script IIFE dengan namespace global `window.CA` agar kompatibel dengan `file://` (tanpa ES module/CORS).

---

## 6. Pengujian

Jalankan:

```powershell
node tests\run.js
```

Hasil terakhir: **44 test lulus, 0 gagal**. Test mencakup validasi grid 10 level, ketercapaian tujuan, syarat koin/energi/tombol, dunia (belok, dinding, jurang, jump, koin, sensor), penilaian bintang, dan interpreter (urutan, Repeat, infinite-loop guard, serta pemeriksaan tanpa `eval`).

QA browser juga telah dilakukan untuk:
- Menyelesaikan ke-10 level lewat UI hingga modal **Misi Berhasil!**.
- Blok variabel/event, fungsi, Repeat Until/sensor, debugging, dan final project.
- Login guru, kelas/kode kelas, Teacher Challenge, ekspor/impor, gabung kelas.
- Profil, setelan, reset data + pemulihan, toggle toolbox, tombol RUN mobile.
- Service worker aktif, 34 aset inti ter-cache, dan tidak ada error console.

---

## 7. Teknis singkat

- Dunia berupa grid deterministik; render pixel art prosedural oleh Phaser Graphics.
- Interpreter menelusuri pohon blok Blockly memakai generator functions + `yield`.
- Pseudocode/Code Preview dibuat terpisah dari eksekusi.
- Penyimpanan: IndexedDB `code-adventure-db` → store `kv` → key `app-state`; fallback `localStorage` dengan key `code-adventure-state`.
- Tidak ada dependency runtime dari internet; tidak ada telemetry; tidak ada backend.

---

## 8. Pemecahan masalah

**Progres hilang setelah edit source saat QA lokal?**
Service worker memakai cache-first. Unregister service worker dan hapus cache, lalu reload:

```js
Promise.all([
  navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister()))),
  caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k))))
])
```

Versi cache saat ini adalah `code-adventure-v3`; naikkan bila aset inti berubah agar pengguna mendapat versi baru otomatis.

**PIN guru terlupa?**
Kunjungi Setelan; PIN saat ini ditampilkan di sana. Nilai awal adalah `1234`.

**Tantangan harian tidak berubah?**
Daily Challenge dibuat deterministik dari tanggal (`YYYY-MM-DD`), sehingga semua siswa mendapat peta yang sama pada hari yang sama.
