# 🥷 Ninja Heroes Private Server - Backend & Game Client

Repositori backend resmi dan game client untuk Private Server **Ninja Heroes / Heroes Legend**, terintegrasi penuh untuk deployment instan di hosting cPanel domain **`nh.digislams.my.id`**.

---

## 📌 Ringkasan Sistem

| Komponen | Spesifikasi / Keterangan |
| :--- | :--- |
| **Domain Utama** | `http://nh.digislams.my.id` |
| **GitHub Repository** | `https://github.com/19235002-debug/NH-Project` |
| **Backend Engine** | Laravel (PHP 8.1+) + MySQL/MariaDB |
| **WebSocket Engine** | Python 3 Async WebSocket Server (`game_server.py`) |
| **Game Client APK** | `OkkaNHNE-Private.apk` (Dual Signed Android v1+v2, 4-byte ZipAligned) |
| **Asset & Mekanik** | **100% Original & Utuh** (220 Shinobi, 345 Jutsu, Animasi, Sound, Stats) |

---

## 🚀 Panduan Deployment di Terminal cPanel Hosting

Anda dapat melakukan deployment dan pembaruan backend kapan saja hanya dengan mengetik perintah **`deploy`** di Terminal cPanel.

### Langkah 1: Setup Awal di cPanel (Hanya Sekali)

1. **Buka Terminal cPanel** di dashboard cPanel hosting Anda.
2. Masuk ke direktori web domain `nh.digislams.my.id` (biasanya `public_html` atau `public_html/nh`):
   ```bash
   cd ~/public_html
   ```
3. Clone repository ini (jika folder belum berisi repo):
   ```bash
   git clone https://github.com/19235002-debug/NH-Project.git .
   ```
4. **Import Database**:
   - Buka menu **MySQL Databases** di cPanel, buat database baru (misal: `user_ninja`) dan buat user MySQL beserta passwordnya.
   - Buka **phpMyAdmin**, pilih database tersebut, lalu klik tab **Import** dan pilih file `database.sql` yang ada di dalam repository ini.
5. **Konfigurasi File `.env`**:
   - Salin file template:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` dan masukkan nama database, username, dan password MySQL cPanel Anda:
     ```ini
     DB_DATABASE=nama_cpanel_ninja
     DB_USERNAME=user_cpanel_ninja
     DB_PASSWORD=password_database_anda
     GAME_HOST=nh.digislams.my.id
     GAME_WS_PORT=8080
     ```

---

### Langkah 2: Mengaktifkan Shortcut Perintah `deploy`

Agar Anda dapat mengetik perintah **`deploy`** secara langsung di Terminal cPanel dari direktori mana pun:

Jalankan perintah ini **1 kali saja** di terminal:
```bash
echo "alias deploy='cd ~/public_html && ./deploy'" >> ~/.bashrc && source ~/.bashrc
```
*(Sesuaikan `~/public_html` jika domain Anda berada di subfolder seperti `~/nh.digislams.my.id`)*

Sekarang, setiap kali Anda ingin memperbarui website dan backend dengan kode terbaru dari GitHub, Anda cukup mengetik:
```bash
deploy
```

---

## ⚡ Apa yang Dilakukan oleh Script `deploy`?

Ketika Anda menjalankan perintah `deploy`:
1. 📥 **Git Sync**: Otomatis menarik commit terbaru dari branch `main` di GitHub.
2. 🔒 **Permissions**: Mengatur permission file (`755` folder, `777` storage/cache).
3. ⚙️ **Environment**: Memverifikasi `.env` dan membuat Application Key jika belum ada.
4. 📦 **Dependencies**: Menjalankan `composer install` secara otomatis.
5. ⚡ **Cache Optimization**: Membersihkan & mengoptimalkan view, route, dan config cache Laravel.
6. 🎮 **Game Server Daemon**: Memeriksa dan menjalankan `game_server.py` di background (daemon) jika belum aktif.

---

## 📱 Game Client & Alur Backend

### 1. File Game yang Tersedia
- `OkkaNHNE-Private.apk` — File installer APK Android yang sudah dipatch ke `http://nh.digislams.my.id` dan ditandatangani dengan Dual Sign v1 + v2.
- `OkkaNHNE-Private.zip` — Versi arsip ZIP dari game yang sinkron 100%.

### 2. Jalur Download Langsung
Pemain dapat mendownload APK langsung melalui browser:
```
http://nh.digislams.my.id/download
```
atau
```
http://nh.digislams.my.id/apk
```

### 3. Alur Komunikasi Game Client ke Backend
```
[Android APK / Emulator]
         │
         ├──► HTTP Request: http://nh.digislams.my.id/notice (Informasi Server)
         ├──► HTTP Request: http://nh.digislams.my.id/game/login (Login & Autentikasi)
         ├──► HTTP Request: http://nh.digislams.my.id/game/servers (Daftar Server S1 Konoha)
         │
         ▼
[WebSocket Game Engine: ws://nh.digislams.my.id:8080/nadsocket]
         │
         ├── In-Game Data Sync (Inventory, Ninjas, Team Formations, Jutsus)
         ├── Gacha Summon (Basic, Advanced, Special 10x, Claw Crane UR)
         ├── Shinobi Combine & Ninja Fusion
         └── Ramen Stamina Claim & Village Upgrades
```

---

## 🛠️ Panel Web & Manajemen Shinobi

Backend ini dilengkapi Web Portal lengkap:
- **Shinobi Portal** (`/player/dashboard`): Formasi tim ninja, summon gacha, perlengkapan jutsu, codex shinobi, klaim ramen harian.
- **Admin Command Center** (`/admin`): Manajemen akun pemain, gift Gold & Silver, pengaturan pengumuman server (Notice), serta Packet Inspector live.

---

*Dikembangkan untuk komunitas Shinobi Ninja Heroes Private Server.*
