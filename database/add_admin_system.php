<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

$pdo = Database::getConnection();
$driver = Database::getDriver();

echo "[*] Upgrading database for Admin/GM system...\n";

if ($driver === 'mysql') {
    // Check and add role
    $cols = $pdo->query("SHOW COLUMNS FROM users LIKE 'role'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN `role` VARCHAR(20) NOT NULL DEFAULT 'user' AFTER `username`");
        echo "[+] Added 'role' column to users.\n";
    }

    // Check and add is_banned
    $cols = $pdo->query("SHOW COLUMNS FROM users LIKE 'is_banned'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN `is_banned` TINYINT(1) NOT NULL DEFAULT 0 AFTER `role`");
        echo "[+] Added 'is_banned' column to users.\n";
    }

    // Check and add ban_reason
    $cols = $pdo->query("SHOW COLUMNS FROM users LIKE 'ban_reason'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN `ban_reason` VARCHAR(255) NULL AFTER `is_banned`");
        echo "[+] Added 'ban_reason' column to users.\n";
    }

    // Create server_notices table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `server_notices` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `title` VARCHAR(150) NOT NULL,
            `content` TEXT NOT NULL,
            `is_active` TINYINT(1) NOT NULL DEFAULT 1,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "[+] Created 'server_notices' table.\n";
} else {
    // SQLite
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN is_banned INTEGER NOT NULL DEFAULT 0");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN ban_reason TEXT NULL");
    } catch (Exception $e) {}

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS server_notices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
}

// Ensure default notice exists
$noticeCount = (int)$pdo->query("SELECT COUNT(*) FROM server_notices")->fetchColumn();
if ($noticeCount === 0) {
    $ins = $pdo->prepare("INSERT INTO server_notices (title, content, is_active) VALUES (?, ?, 1)");
    $ins->execute([
        "Selamat Datang di Ninja Heroes Private Server!",
        "Nikmati nostalgia pertarungan ninja legendaris! Event Gacha Rate Up & Double Exp aktif sepanjang minggu. Hubungi Game Master bila mengalami kendala."
    ]);
    echo "[+] Seeded initial server notice.\n";
}

// Make 'master_shinobi' and 'admin' GM/Admin accounts
$stmt = $pdo->prepare("SELECT id FROM users WHERE username = 'admin'");
$stmt->execute();
$adminUser = $stmt->fetch();

if (!$adminUser) {
    $passHash = password_hash('admin123', PASSWORD_DEFAULT);
    $insAdmin = $pdo->prepare("
        INSERT INTO users (username, role, password_hash, level, silver, gold, stamina, vip_level, avatar_ninja_id)
        VALUES ('admin', 'admin', ?, 100, 99999999, 999999, 500, 12, 1)
    ");
    $insAdmin->execute([$passHash]);
    $adminId = (int)$pdo->lastInsertId();
    echo "[+] Created default GM account: 'admin' (password: 'admin123').\n";

    // Grant top-tier ninja to admin
    $pdo->prepare("INSERT INTO player_ninjas (user_id, ninja_id, level, exp, is_main, jutsu_slot_1) VALUES (?, 1, 50, 0, 1, 1)")->execute([$adminId]);
} else {
    $pdo->exec("UPDATE users SET role = 'admin' WHERE username = 'admin'");
    echo "[+] Updated user 'admin' to role 'admin'.\n";
}

// Also grant admin role to 'master_shinobi' if present
$pdo->exec("UPDATE users SET role = 'admin' WHERE username = 'master_shinobi'");

echo "[OK] Admin/GM database upgrade completed successfully!\n";
