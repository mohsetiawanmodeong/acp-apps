# ACP Log Converter

Aplikasi ini membantu Anda mengonversi log ACP ADAM dari format teks (.txt) menjadi format JSON yang siap diimpor ke dalam database.

## Cara Penggunaan

1. Buka file `index.html` di browser Anda
2. Pilih satu atau beberapa file log (format .txt)
3. Pilih zona waktu yang sesuai (default: WIT - UTC+9)
4. Klik tombol "Convert"
5. Lihat preview hasil konversi atau download file JSON

## Format Konversi

Aplikasi ini mengonversi log dalam format:

```
2025-04-02 3:55:00 PM - Parking Brake System OFF
```

Menjadi format JSON:

```json
{
  "MACHINE_NAME": "648",
  "START_TIME": "2025-04-02 15:55:00.000 +09:00",
  "CATEGORY": "DO-0",
  "TYPE": "PARKING_BRAKE",
  "MEASUREMENT": "BIT",
  "VALUE": "0"
}
```

## Pemetaan Kategori

- **Parking Brake System**:
  - CATEGORY: DO-0
  - TYPE: PARKING_BRAKE
  - VALUE: 1 (ON) / 0 (OFF)

- **Wall Collision FRONT**:
  - CATEGORY: DI-0
  - TYPE: FRONT_SAFE_ZONE
  - VALUE: 1 (ON) / 0 (OFF)

- **Wall Collision REAR**:
  - CATEGORY: DI-2
  - TYPE: REAR_SAFE_ZONE
  - VALUE: 1 (ON) / 0 (OFF)

## Fitur

- Konversi multiple file sekaligus
- Ekstraksi otomatis machine_name dari nama file (format: cps_log_648_*)
- Kustomisasi machine_name jika tidak ditemukan di nama file
- Preview hasil konversi
- Download hasil konversi dalam format JSON
- Pilihan zona waktu

## Pengembangan

Aplikasi ini dapat dikembangkan lebih lanjut dengan menambahkan fitur:

1. Konversi batch dengan drag-and-drop
2. Upload langsung ke database
3. Penambahan kategori log lainnya

## Catatan Teknis

Aplikasi ini berjalan sepenuhnya di sisi klien (browser) sehingga tidak memerlukan koneksi internet setelah file diunduh. 