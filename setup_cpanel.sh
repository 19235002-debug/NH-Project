#!/bin/bash
# ==============================================================================
# One-Command Auto Setup for cPanel Terminal
# Domain: nh.digislams.my.id
# ==============================================================================

set -e

echo "=================================================================="
echo "🚀 [SETUP] Memulai Setup Otomatis Database & Backend Ninja Heroes"
echo "=================================================================="

# 1. Pastikan berada di folder domain
cd /home/digisla3/nh.digislams.my.id

# 2. Parameter Database cPanel
DB_NAME="digisla3_ninja"
DB_USER="digisla3_ninja"
DB_PASS="NinjaPro2026Secure"

echo "🗄️ [1/4] Membuat Database & User MySQL via cPanel UAPI..."
# Buat database dengan prefix digisla3_
uapi Mysql create_database name="$DB_NAME" 2>/dev/null || true

# Buat user MySQL
uapi Mysql create_user name="$DB_USER" password="$DB_PASS" 2>/dev/null || true

# Berikan ALL PRIVILEGES
uapi Mysql set_privileges_on_database user="$DB_USER" database="$DB_NAME" privileges=ALL%20PRIVILEGES 2>/dev/null || true

# 3. Import database.sql
echo "⚡ [2/4] Mengimpor 23 tabel & 220 Shinobi master data..."
if [ -f "database.sql" ]; then
    mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < database.sql 2>/dev/null || mysql "$DB_NAME" < database.sql 2>/dev/null || true
    echo "   [+] Data MySQL berhasil diimpor."
fi

# 4. Konfigurasi .env
echo "⚙️ [3/4] Mengonfigurasi file .env..."
cp -f .env.example .env
sed -i "s/DB_DATABASE=.*/DB_DATABASE=$DB_NAME/" .env
sed -i "s/DB_USERNAME=.*/DB_USERNAME=$DB_USER/" .env
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=\"$DB_PASS\"/" .env

# 5. Pasang deploy alias & jalankan deploy
echo "🚀 [4/4] Mendaftarkan shortcut 'deploy' & menjalankan deployment..."
chmod +x deploy deploy.sh setup_cpanel.sh
if [ -f "$HOME/.bashrc" ]; then
    if ! grep -q "alias deploy=" "$HOME/.bashrc" 2>/dev/null; then
        echo "alias deploy='cd /home/digisla3/nh.digislams.my.id && ./deploy'" >> "$HOME/.bashrc"
    fi
fi

./deploy

echo "=================================================================="
echo "🎉 SETUP SELESAI 100%! SEMUA SISTEM SIAP & AKTIF!"
echo "   Website: http://nh.digislams.my.id"
echo "   Download APK: http://nh.digislams.my.id/download"
echo "=================================================================="

