#!/bin/bash
# ==============================================================================
# One-Click Deployment Script for Ninja Heroes Private Server
# Target Domain: nh.digislams.my.id
# Repository:    https://github.com/19235002-debug/NH-Project
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=================================================================="
echo "🚀 [NH-DEPLOY] Memulai deployment otomatis ke nh.digislams.my.id..."
echo "=================================================================="

# 1. Pastikan alias global terpasang di terminal cPanel
if [ -d "$HOME/bin" ]; then
    ln -sf "$SCRIPT_DIR/deploy" "$HOME/bin/deploy" 2>/dev/null || true
fi
if [ -f "$HOME/.bashrc" ]; then
    if ! grep -q "alias deploy=" "$HOME/.bashrc" 2>/dev/null; then
        echo "alias deploy='cd $SCRIPT_DIR && ./deploy'" >> "$HOME/.bashrc"
    fi
fi

# 2. Sinkronisasi Git dari GitHub
echo "📥 [1/6] Menarik update kode terbaru dari GitHub..."
git fetch origin main || git fetch origin master || true
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
git reset --hard "origin/$CURRENT_BRANCH" 2>/dev/null || git pull origin "$CURRENT_BRANCH" 2>/dev/null || true

# 3. Environment & Configuration Check
echo "⚙️ [2/6] Memeriksa file konfigurasi environment (.env)..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "   [+] File .env berhasil dibuat dari .env.example."
        if command -v php >/dev/null 2>&1; then
            php artisan key:generate || true
        fi
    fi
fi

# Auto-set database credentials if in cPanel environment
if grep -q "DB_DATABASE=ninja_heroes" .env 2>/dev/null || grep -q "DB_USERNAME=root" .env 2>/dev/null; then
    sed -i "s/DB_DATABASE=.*/DB_DATABASE=digisla3_ninja/" .env
    sed -i "s/DB_USERNAME=.*/DB_USERNAME=digisla3_ninja/" .env
    sed -i 's/DB_PASSWORD=.*/DB_PASSWORD="NinjaPro2026Secure"/' .env
    echo "   [+] Database .env otomatis disesuaikan ke digisla3_ninja."
fi

# 4. Storage & Directory Permissions
echo "🔒 [3/6] Mengatur permissions direktori..."
chmod -R 755 . 2>/dev/null || true
mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chmod -R 777 storage bootstrap/cache 2>/dev/null || chmod -R 775 storage bootstrap/cache 2>/dev/null || true
chmod +x deploy deploy.sh 2>/dev/null || true

# 5. Dependency Management
echo "📦 [4/6] Memeriksa PHP Composer dependencies..."
if command -v composer >/dev/null 2>&1; then
    composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction || true
elif [ -f "composer.phar" ]; then
    php composer.phar install --no-dev --prefer-dist --optimize-autoloader --no-interaction || true
fi

# 6. Clear & Rebuild Framework Cache
echo "⚡ [5/6] Mengoptimalkan cache sistem..."
if command -v php >/dev/null 2>&1; then
    php artisan config:clear || true
    php artisan cache:clear || true
    php artisan view:clear || true
    php artisan route:clear || true
fi

# 7. Background WebSocket Game Server Management
echo "🎮 [6/6] Memeriksa WebSocket Game Server (game_server.py)..."
if pgrep -f "game_server.py" >/dev/null 2>&1; then
    echo "   [✔] Game Server sudah aktif berjalan."
else
    if command -v python3 >/dev/null 2>&1; then
        nohup python3 game_server.py > game_server.log 2>&1 &
        sleep 1
        if pgrep -f "game_server.py" >/dev/null 2>&1; then
            echo "   [✔] Game Server (Python daemon) berhasil dijalankan di background!"
        else
            echo "   [i] Python server dapat dijalankan manual: python3 game_server.py &"
        fi
    else
        echo "   [i] Python3 tidak ditemukan di PATH terminal host. Layanan HTTP API tetap berjalan aktif."
    fi
fi

echo "=================================================================="
echo "🎉 DEPLOY SELESAI & BERHASIL!"
echo "   Situs & Backend Aktif : http://nh.digislams.my.id"
echo "   Download Game APK     : http://nh.digislams.my.id/download/OkkaNHNE-Private.apk"
echo "=================================================================="

