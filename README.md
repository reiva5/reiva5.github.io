# reiva5.github.io

[![CI master](https://github.com/reiva5/reiva5.github.io/actions/workflows/ci.yml/badge.svg?branch=master&event=push)](https://github.com/reiva5/reiva5.github.io/actions/workflows/ci.yml?query=branch%3Amaster)
[![Minimum source-file coverage](https://reiva5.github.io/coverage/coverage.svg)](https://reiva5.github.io/coverage/index.html)

Website personal statis dengan gaya neo-brutalist yang terinspirasi Hacktoberfest.
Halaman tetap menggunakan HTML, CSS, dan JavaScript tanpa dependency runtime.
Tooling Node.js digunakan untuk memvalidasi dan menyiapkan hasil build.

- `index.html`: layout Home dan menu.
- `resume.html`: Resume dengan submenu Cards, Projects, dan Page.
- `styles.css`: tema, tipografi, dan layout responsif.
- `script.js`: sidebar collapsible dan navigasi keyboard.
- `resume.js`: navigasi antarbagian Resume melalui hash URL.
- `resume-cards.js`: kelas card, adapter per platform, dan pemuatan independen.
- `data/resume/`: snapshot metadata yang aman ditampilkan publik.
- `assets/logos/`: logo situs lokal beserta lisensi icon yang terkait.
- `scripts/build.mjs`: menyiapkan aset statis di `dist`.

Home masih berupa placeholder kosong. Resume tersedia di `resume.html` dan
dimulai dari Cards; Projects dan Page masih berupa placeholder. Submenu dapat
dibuka langsung melalui hash URL, termasuk tanpa JavaScript.

Badge CI menunjukkan status push `master` terbaru. Badge dan report coverage
berasal dari deployment `master` sukses terakhir, dan baru tersedia setelah
deployment Actions pertama. Jika build atau test gagal, deployment sebelumnya
tetap dipertahankan; hasil run yang gagal tersedia di Actions.

## Preview lokal

Gunakan Node.js 24 dan jalankan dari root repository:

```powershell
npm ci
npm run build
npm run preview
```

Kemudian buka `http://127.0.0.1:4173/`. Build memeriksa sintaks JavaScript dan
menyalin hanya aset website ke `dist`, bukan dependency atau tooling pengembangan.

Untuk melihat source tanpa tooling, `index.html` dan `resume.html` juga dapat
dibuka langsung di browser. Tautan profil tersedia tanpa JavaScript; pemuatan
snapshot JSON membutuhkan server HTTP lokal, bukan URL `file:`.

## Unit tests

```powershell
npm test
npm run test:coverage
npm run report:coverage
```

Test memakai DOM terisolasi untuk memeriksa navigasi, sidebar desktop,
drawer mobile, ARIA, fokus keyboard, pergantian viewport, adapter card,
validasi metadata, kegagalan terisolasi, timeout, dan retry. Coverage
JavaScript halaman dan helper pelaporan/metadata PR wajib minimal **90% per file** untuk
statements, branches, functions, dan lines. Report HTML tersedia di
`coverage/index.html`, hasil unit test di JSON/JUnit XML, dan badge SVG di
`coverage/coverage.svg`. Badge menampilkan persentase terendah di antara seluruh
file dan metric, bukan aggregate yang dapat menyembunyikan file kurang teruji.
Coverage mengukur JavaScript, bukan persentase HTML/CSS. Perilaku browser dan
layout tetap diperiksa terpisah melalui Playwright.

Baseline saat CI diperkenalkan: **76 unit tests dan 14 browser tests lulus**.

| Metric JavaScript | Coverage baseline | Tercover / total |
| --- | ---: | ---: |
| Statements | 100% | 148 / 148 |
| Branches | 100% | 111 / 111 |
| Functions | 100% | 23 / 23 |
| Lines | 100% | 142 / 142 |

Angka tersebut adalah snapshot baseline, bukan pengganti report terbaru pada
badge, Pages, dan artifact Actions.

## Browser tests

Pasang Chromium untuk Playwright satu kali:

```powershell
npx playwright install chromium
```

```powershell
npm run build
npm run test:browser
```

Test browser memeriksa hasil build, ukuran layar 320-1440px, batas breakpoint
760px, navigasi keyboard nyata, modal mobile, submenu Resume, dan reduced motion.
Card diperiksa dari script dan snapshot hasil build yang sama, termasuk
metadata panjang, kegagalan provider, timeout tepat 8 detik, retry mandiri,
dan keadaan KTOM sebelum/sesudah snapshot tersedia. Respons API eksternal
dikontrol dalam test agar CI tidak bergantung pada jaringan atau akun platform.
Test tetap berjalan tanpa Google Fonts. Report tersedia di `playwright-report`.

Untuk menjalankan seluruh pemeriksaan lokal:

```powershell
npm run check
```

## CI/CD

Workflow `CI` berjalan pada push, PR ke `master`, dan pemicu manual.

| Check | Kondisi lulus |
| --- | --- |
| `Build` | Sintaks JavaScript valid dan aset statis berhasil dibangun. |
| `Unit tests and coverage` | Seluruh unit test lulus; setiap file mencapai minimal 90% pada seluruh metric. |
| `Browser tests` | Perilaku dan layout hasil build lulus di Chromium. |

Browser tests menggunakan artifact `site-dist` yang sama dengan deployment,
bukan build kedua. Hasil unit test JSON/JUnit, coverage HTML/LCOV/JSON/SVG,
dan report browser disimpan sebagai artifact Actions selama 14 hari, termasuk
saat test gagal. Ringkasan hasil tersedia pada halaman workflow run.

`master` harus mewajibkan ketiga check tersebut melalui branch protection,
termasuk untuk administrator, dan branch harus up-to-date sebelum merge.
Threshold saja tidak mencegah merge jika required checks tidak diaktifkan.
Perubahan tetap masuk melalui PR; tidak diperlukan approval dari reviewer lain.

## Deskripsi PR

Workflow `PR description` mengisi daftar seluruh commit pada branch, termasuk
detail pesan commit, ketika PR dibuka atau diperbarui. Bagian terkelola dari
template diganti tanpa menghapus ringkasan atau catatan yang ditulis manual.
Pengambilan commit menggunakan SHA tetap dan pagination, bukan batas default
250 commit. Metadata pesan diperlakukan sebagai teks, tidak sebagai kode.

Workflow dengan izin tulis hanya checkout revision **base** yang terpercaya;
tidak pernah menjalankan source atau dependency dari head PR. Otomatisasi ini
mulai aktif setelah workflow tersebut tersedia di `master`; PR pertama yang
memperkenalkannya masih memerlukan daftar commit saat dibuat.

GitHub hanya mengizinkan **Squash and Merge**; merge commit dan rebase dinonaktifkan.
Judul squash otomatis menggunakan **judul PR**, dan isi commit squash menggunakan
**seluruh detail pesan commit**. Riwayat branch fitur tetap terdiri dari commit
terpisah sesuai langkah implementasi sampai PR di-merge.

Instruksi kontribusi dan perintah pemeriksaan manual untuk Copilot app ada di
`.github/github-app.yml`. File ini tidak menggantikan pengaturan merge dan
branch protection native pada GitHub.

## GitHub Pages

Publishing source harus **Settings > Pages > Source > GitHub Actions**,
bukan deployment langsung dari sebuah branch. Push ke `master` baru menerbitkan
website setelah ketiga check di atas berhasil; PR dan branch fitur tidak deploy.
Artifact yang telah diverifikasi serta report coverage diterbitkan bersama
di `https://reiva5.github.io/`.

File `.nojekyll` menandai bahwa website ini tidak membutuhkan pemrosesan Jekyll.
Aset lokal memakai URL relatif sehingga layout juga dapat dipasang pada subpath.
Font Google bersifat opsional; font sistem digunakan jika font tersebut tidak
dapat dimuat.

## Sidebar

Pada desktop, sidebar terbuka secara default dan tombol menu dapat
menyembunyikan atau menampilkannya. Pada layar selebar 760px atau kurang,
sidebar menjadi drawer yang tertutup secara default.

Drawer dapat ditutup melalui tombol tutup, area di luar menu, atau tombol
Escape. Saat drawer terbuka, fokus keyboard tetap berada di dalam menu.
Memilih tautan menu juga menutup drawer. Navigasi submenu Resume memindahkan
fokus ke judul bagian yang dipilih.

## Resume dan profile cards

Resume tersedia di `resume.html`, dengan tiga submenu:
`#cards`, `#projects`, dan `#resume-page` (label **Page**).
Cards menjadi bagian awal; Projects dan Page sengaja masih berupa placeholder.
URL dapat dibuka langsung, mendukung Back/Forward, dan tetap memiliki tujuan
anchor ketika JavaScript tidak aktif.

### Telaah jenis card dan sumber data

Setiap card memuat nama lengkap jika tersedia, fallback username, tautan
profil tetap, custom metadata, sumber data, dan waktu pembaruan jika diketahui.
Statistik yang belum diperoleh tidak diisi dengan nol atau angka perkiraan.

| Platform / kelas | Kandidat custom metadata | Sumber pada tahap ini |
| --- | --- | --- |
| LinkedIn / `LinkedInCard` | Headline, organisasi, lokasi, bidang keahlian yang ingin dipublikasikan. | `data/resume/linkedin.json`; Profile API membutuhkan akses yang disetujui dan token pengguna. |
| Codeforces / `CodeforcesCard` | Hanya Rank saat ini dan Rating tertinggi. | API publik `user.info`; `rank` dan `maxRating` dipetakan jika tersedia. Rating saat ini, rank tertinggi, kontribusi, dan organisasi tidak ditampilkan. |
| LeetCode / `LeetCodeCard` | Soal terselesaikan per tingkat kesulitan, contest rating/ranking, badge. | `data/resume/leetcode.json`; belum mengandalkan GraphQL/endpoint web internal sebagai API stabil. |
| Kaggle / `KaggleCard` | Tier, medal, ranking per kategori Competitions, Datasets, Notebooks, Discussions. | `data/resume/kaggle.json`; pengambilan statistik profil membutuhkan adapter khusus, bukan asumsi bahwa seluruh statistik tersedia dari CLI. |
| KTOM / `KtomCard` | ID pengguna 1601; skor, peringkat, atau riwayat yang dapat diverifikasi setelah login. | `data/resume/ktom.json`; profil mengarahkan pengunjung ke login. Status tetap `authentication-required` sampai snapshot publik disetujui. |

Kandidat metadata adalah rancangan field, bukan klaim mengenai statistik akun.
Snapshot awal LinkedIn, LeetCode, dan Kaggle masih kosong. Snapshot KTOM hanya
memuat ID yang sudah ada pada URL publik. Login/scraper KTOM **belum
diimplementasikan**; mekanisme autentikasi dan field privatnya perlu diverifikasi
melalui sesi yang diizinkan sebelum membuat adapter.

Referensi: [Codeforces `user.info`](https://codeforces.com/apiHelp/methods#user.info),
[LinkedIn Profile API dan batas aksesnya](https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api),
serta [dokumentasi CLI Kaggle](https://github.com/Kaggle/kaggle-cli).

### Logo situs

Header card memakai gambar logo, bukan kode huruf. Gambar disimpan lokal,
ikut masuk ke build statis, dan tersedia tanpa JavaScript maupun respons
metadata. Ukuran tampilannya tetap 32px di dalam bingkai 48px dengan
`object-fit: contain`, sehingga rasio gambar tidak berubah. Logo dekoratif
memakai `alt=""`; nama platform sudah tersedia sebagai judul card.

| Aset | Sumber |
| --- | --- |
| `linkedin.png` | `LI-In-Bug.png` dari [arsip logo resmi LinkedIn](https://content.linkedin.com/content/dam/me/business/en-us/amp/xbu/linkedin-revised-brand-guidelines/logos/in-logo.zip), mengikuti [panduan merek LinkedIn](https://brand.linkedin.com/). |
| `codeforces.svg`, `leetcode.svg` | Path logo dari [Simple Icons revision `4d29a35`](https://github.com/simple-icons/simple-icons/tree/4d29a35c954699b389a834aacc97dd6e7e74143c/icons), dengan warna merek dan tanpa perubahan geometri. Lisensi CC0 disertakan di `assets/logos/SIMPLE-ICONS-LICENSE.txt`. |
| `kaggle.ico` | [Favicon resmi Kaggle](https://www.kaggle.com/static/images/favicon.ico). |
| `ktom.png` | Apple touch icon dari [halaman publik KTOM](https://ktom-tomi.or.id/), digunakan tanpa login dan tanpa mengubah gambar aslinya. |

Logo hanya mengidentifikasi situs dari profil yang ditautkan, bukan
menyatakan afiliasi atau dukungan resmi. Hak merek tetap milik masing-masing
pemilik; lisensi CC0 Simple Icons hanya berlaku untuk dua aset SVG tersebut.

### Konsep OOP dan isolasi pemuatan

`ProfileCard` menangani identitas, rendering berbasis teks, status, timeout,
dan retry. `fetchDetails(signal)` adalah kontrak adapter yang dikembalikan
sebagai metadata ternormalisasi. `SnapshotCard` mengimplementasikan kontrak
tersebut untuk JSON publik; kelas tiap platform menentukan sumber dan identitas
masing-masing. `CodeforcesCard` memiliki adapter API sendiri.

Kelima objek tersedia melalui `window.ResumeCards.cards`. Inisialisasi memanggil
`card.load()` satu per satu tanpa menunggu hasil card lain dan tanpa
`Promise.all` yang menahan rendering. Setiap pemanggilan memiliki
`AbortController` serta batas **8 detik** sendiri. Request yang sedang berjalan
pada card yang sama tidak diduplikasi. Retry hanya memanggil sumber card itu,
tanpa cookie/kredensial browser dan tanpa menggunakan cache metadata lama.

Status card adalah `idle`, `loading`, `ready`, `empty`,
`authentication-required`, atau `error`. Kegagalan HTTP, JSON, format data,
jaringan, dan timeout tampil pada card yang bersangkutan. Identitas/tautan
profil tetap tersedia, dan metadata terakhir yang sukses dipertahankan ketika
refresh gagal. Kegagalan satu platform tidak menggagalkan build statis.

### Mengisi custom metadata

Edit snapshot platform yang sesuai menggunakan empat field berikut. Ini
contoh format, bukan data profil yang sudah diambil:

```json
{
  "fullName": "Nama publik yang ingin ditampilkan",
  "metadata": [
    { "label": "Headline", "value": "Teks metadata publik" },
    { "label": "Jumlah", "value": 0 },
    { "label": "Aktif", "value": false }
  ],
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "authenticationRequired": false
}
```

Gunakan `fullName: null` jika nama belum tersedia, `metadata: []` jika belum
ada detail, dan `updatedAt: null` jika waktu pembaruan belum diketahui.
Label harus berupa string tidak kosong; value berupa string tidak kosong,
angka finite, atau boolean. Angka nol dan boolean false tetap ditampilkan.
`updatedAt` berupa tanggal valid; format ISO 8601 UTC disarankan.
KTOM baru boleh diubah menjadi `authenticationRequired: false` setelah
metadata yang dipilih diverifikasi dan disetujui untuk ditampilkan publik.

Nama dan metadata dirender melalui `textContent`, bukan HTML. Username dan
URL profil ditentukan oleh kelas, tidak dapat diganti dari snapshot.
**Seluruh isi file snapshot dapat dibaca publik**, termasuk field tambahan
yang tidak dirender. Validator bukan alat redaksi rahasia: jangan menambahkan
password, token, cookie, email login, atau dump respons autentikasi ke file ini.

### Membagikan kredensial KTOM dengan aman

Jangan membagikan nilai kredensial melalui chat, issue, deskripsi PR, source,
atau JSON yang dipublikasikan. Masukkan sendiri melalui GitHub
**Settings > Secrets and variables > Actions**, idealnya sebagai environment
secret pada environment khusus `profile-sync` yang membatasi branch
terpercaya (`master`) dan memiliki persetujuan sebelum job dijalankan.
Gunakan nama seperti `KTOM_USERNAME` dan `KTOM_PASSWORD`; beri tahu kolaborator
hanya nama secret tersebut, bukan nilainya. Bila platform menyediakan token
dengan hak baca terbatas, utamakan token itu. Cookie/session juga merupakan
rahasia dan perlu perlindungan yang sama.

Untuk integrasi berikutnya, jalankan pengambilan terautentikasi di tooling
privat/runner GitHub Actions, bukan JavaScript pengunjung. Berikan secret
hanya ke job KTOM; jalankan kode dari revision terpercaya, jangan menjalankan
head PR atau kode fork dengan akses secret. Export hanya allowlist metadata
yang telah disetujui ke snapshot publik. Jangan menyimpan respons HTML mentah,
cookie jar, browser storage state, screenshot login, trace, atau kredensial
di log/artifact/build. Repository privat untuk pengambilan data dapat digunakan
agar proses autentikasi terpisah dari repository situs publik.

File `.env`, `.env.*`, dan direktori `.private/` diabaikan Git; build hanya
menyalin daftar aset situs dan empat snapshot publik yang ditentukan eksplisit.
Ignore bukan vault dan tidak melindungi file yang sudah dilacak. Jika rahasia
terlanjur bocor, cabut/rotasi terlebih dahulu; menghapus file saja tidak
menghapusnya dari history. Tahap ini belum membuat workflow autentikasi atau
membaca secret KTOM.

Referensi pengaturan:
[Using secrets in GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).
