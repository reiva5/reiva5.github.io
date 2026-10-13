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

Untuk melihat source tanpa tooling, `index.html` juga dapat dibuka langsung
di browser.

## Unit tests

```powershell
npm test
npm run test:coverage
npm run report:coverage
```

Test memakai DOM terisolasi untuk memeriksa navigasi, sidebar desktop,
drawer mobile, ARIA, fokus keyboard, dan pergantian viewport. Coverage
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
