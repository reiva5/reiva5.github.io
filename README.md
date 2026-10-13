# reiva5.github.io

Website personal statis dengan gaya neo-brutalist yang terinspirasi Hacktoberfest.
Halaman tetap menggunakan HTML, CSS, dan JavaScript tanpa dependency runtime.
Tooling Node.js digunakan untuk memvalidasi dan menyiapkan hasil build.

- `index.html`: layout Home dan menu.
- `styles.css`: tema, tipografi, dan layout responsif.
- `script.js`: sidebar collapsible dan navigasi keyboard.
- `scripts/build.mjs`: menyiapkan aset statis di `dist`.

Home masih berupa placeholder kosong. Resume sengaja dinonaktifkan dan tidak
memiliki tujuan navigasi.

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

## GitHub Pages

Setelah perubahan digabungkan ke `master`, pilih **Settings > Pages > Deploy
from a branch**, branch **master**, dan folder **/(root)**. GitHub akan
menerbitkan website di `https://reiva5.github.io/`.

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
