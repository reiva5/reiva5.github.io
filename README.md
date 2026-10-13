# reiva5.github.io

Kerangka website personal statis dengan gaya neo-brutalist yang terinspirasi
Hacktoberfest. Tidak membutuhkan dependency atau proses build.

- `index.html`: layout Home dan menu.
- `styles.css`: tema, tipografi, dan layout responsif.
- `script.js`: sidebar collapsible dan navigasi keyboard.

Home masih berupa placeholder kosong. Resume sengaja dinonaktifkan dan tidak
memiliki tujuan navigasi.

## Preview lokal

Buka `index.html` di browser, atau jalankan server statis dari root repository:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Kemudian buka `http://127.0.0.1:8000/`.

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
