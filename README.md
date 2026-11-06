# Simulasi ASAS SMP Bina Putra

Website tes soal prediksi ASAS — Matematika Kelas IX, ASAS Ganjil 2026/2027,
berdasarkan kisi-kisi MGMP Matematika SMP Kabupaten Lampung Tengah.

**Dibuat oleh Jelly Dharmawan S.Pd.**

- **40 soal per sesi**, waktu **120 menit** (timer hitung mundur, otomatis mengumpulkan saat habis)
- **Bank soal 80 soal**: 2 varian (A/B) untuk tiap indikator 1–40. Tiap sesi diambil 1 varian acak per indikator, lalu urutan soal dan pilihan jawaban (PG & Menjodohkan) diacak.
- **Skor otomatis** dari 30 soal: Pilihan Jamak (20), Benar-Salah (5), Menjodohkan (5). Nilai 0–100.
- **Cek mandiri** untuk 10 soal: Isian Singkat (5) dan Uraian (5) — tampil kunci jawaban dan pembahasan, tidak masuk skor otomatis.
- Riwayat skor tersimpan di `localStorage` perangkat siswa.

## Distribusi materi

| Materi | Soal |
|---|---|
| SPLDV | 10 |
| Bangun Ruang Sisi Datar | 11 |
| Lingkaran | 9 |
| Bangun Ruang Sisi Lengkung | 10 |

## Struktur file

```
index.html                  Halaman utama (beranda, tes, hasil)
assets/css/style.css        Gaya tampilan
assets/js/main.js           Logika: pengacakan, timer, penilaian, riwayat
assets/data/questions.json  Bank soal gabungan (80 soal)
bank/                       Bank soal per materi (sumber, sebelum digabung)
```

## Menjalankan lokal

Dari folder ini, jalankan server statis (jangan buka `index.html` langsung dari file,
karena bank soal dimuat lewat `fetch`):

```bash
python3 -m http.server 8000
```

Lalu buka http://localhost:8000 di browser.

## Publish ke GitHub Pages

1. Buat repository baru bernama `simulasi-asas-smp-bina-putra`.
2. Unggah semua file di folder ini ke branch `main`, di root repository.
3. Di repository, buka **Settings → Pages**, pilih **Deploy from a branch**,
   branch `main`, folder `/ (root)`, lalu simpan.
4. Situs akan live di `https://<username>.github.io/simulasi-asas-smp-bina-putra/`.
