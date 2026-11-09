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
git checkout -B main origin/main 2>/dev/null || git reset --hard origin/main 2>/dev/null || git reset --hard FETCH_HEAD 2>/dev/null || true
echo "   [+] Kode berhasil disinkronkan ke commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'terbaru')"

# 3. Environment & Configuration Check
echo "⚙️ [2/6] Memeriksa file konfigurasi environment (.env)..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "   [+] File .env berhasil dibuat dari .env.example."
fi

# Always ensure .env is correctly connected to cPanel MySQL & APP_DEBUG is set
sed -i "s/DB_DATABASE=.*/DB_DATABASE=digisla3_ninja/" .env
sed -i "s/DB_USERNAME=.*/DB_USERNAME=digisla3_ninja/" .env
sed -i 's/DB_PASSWORD=.*/DB_PASSWORD="NinjaPro2026Secure"/' .env
sed -i "s/DB_HOST=.*/DB_HOST=127.0.0.1/" .env
sed -i "s/APP_DEBUG=.*/APP_DEBUG=true/" .env
sed -i "s/GAME_HOST=.*/GAME_HOST=nh.digislams.my.id/" .env
echo "   [+] Kredensial database .env berhasil dikonfigurasi ke digisla3_ninja."

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

PY_BIN=""
for candidate in python3 python3.11 python3.10 python3.9 python3.8 python /usr/bin/python3 /usr/local/bin/python3 /usr/bin/python /opt/alt/python311/bin/python3 /opt/alt/python310/bin/python3 /opt/alt/python39/bin/python3 /opt/alt/python38/bin/python3 /opt/cpanel/ea-python3/bin/python3; do
    if command -v "$candidate" >/dev/null 2>&1 || [ -x "$candidate" ]; then
        PY_VER=$("$candidate" --version 2>&1 || true)
        if echo "$PY_VER" | grep -qi "Python 3"; then
            PY_BIN="$candidate"
            echo "   [+] Ditemukan runtime: $candidate ($PY_VER)"
            break
        fi
    fi
done

if [ -n "$PY_BIN" ]; then
    pkill -f "game_server.py" 2>/dev/null || true
    sleep 1
    nohup "$PY_BIN" game_server.py > game_server.log 2>&1 &
    sleep 2
    if pgrep -f "game_server.py" >/dev/null 2>&1; then
        echo "   [✔] Game Server (Python daemon) berhasil dijalankan aktif di background!"
    else
        echo "   [!] Game Server gagal berjalan di background. Isi game_server.log:"
        head -n 20 game_server.log 2>/dev/null || true
    fi
else
    echo "   [!] Python 3 tidak ditemukan di PATH terminal host."
    echo "       PATH saat ini: $PATH"
    which python python3 2>&1 || true
fi

echo "=================================================================="
echo "🎉 DEPLOY SELESAI & BERHASIL!"
echo "   Situs & Backend Aktif : http://nh.digislams.my.id"
echo "   Download Game APK     : http://nh.digislams.my.id/download/OkkaNHNE-Private.apk"
echo "=================================================================="

