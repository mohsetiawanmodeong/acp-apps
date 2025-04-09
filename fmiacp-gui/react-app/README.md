# FMIACP React Dashboard

FMIACP Dashboard versi React dengan UI yang sama dengan versi HTML/JS tetapi menggunakan React untuk performa dan maintainability yang lebih baik.

## Cara Menjalankan Aplikasi (Mudah)

1. Install dependencies (sekali saja di awal):
   ```
   cd fmiacp-gui/react-app
   npm install
   ```

2. Jalankan aplikasi:
   ```
   npm start
   ```

3. Aplikasi akan berjalan di http://localhost:3000

## Struktur Folder

```
fmiacp-gui/
  ├── html-app/           # Versi HTML/JS native (versi lama)
  │   ├── css/
  │   ├── js/
  │   ├── img/
  │   └── index.html
  │
  └── react-app/          # Versi React (versi baru)
      ├── node_modules/   # Dependencies (di-ignore oleh Git)
      ├── public/         # File statis
      │   ├── img/        # Gambar  
      │   ├── css/        # CSS 
      │   └── index.html  # Entry point HTML
      └── src/            # Kode React
          ├── components/ # Komponen UI
          ├── services/   # API service
          └── App.js      # Komponen utama
```

## Fitur

- Visualisasi data real-time dengan update otomatis
- Desain responsif untuk semua ukuran perangkat
- Chart dan tabel data interaktif
- Monitoring dan filtering status mesin
- Kemampuan ekspor data
- Log sistem dan status aplikasi
- Desain UI yang sama persis dengan versi HTML/JS
- Bisa bekerja secara offline tanpa internet

## Pengembangan

Untuk pengembangan:

1. Edit file di folder `src/` sesuai kebutuhan
2. Jalankan `npm start` untuk melihat perubahan secara otomatis
3. Gunakan React Developer Tools untuk debug

## Integrasi dengan Backend

Secara default, aplikasi menggunakan data contoh untuk development. Untuk menghubungkan ke API backend:

1. Update `API_BASE_URL` di `src/services/api.js` ke endpoint backend Anda
2. Hapus pengecekan environment development di metode API

## Keunggulan Dibanding Versi HTML/JS

- Arsitektur berbasis komponen untuk organisasi kode yang lebih baik
- Virtual DOM untuk update UI yang efisien
- React hooks untuk manajemen state
- Fitur JavaScript modern
- Performa rendering yang lebih baik
- Penanganan error dan debugging yang lebih baik

## License

Proyek ini bersifat proprietary dan rahasia. 