<?php
/**
 * Database Migration & Master Data Seeder
 * Sets up tables and seeds 30+ classic Naruto characters (D to SS) & Jutsus.
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

function runMigration(): array {
    $pdo = Database::getConnection();
    $driver = Database::getDriver();
    $logs = [];

    $logs[] = "Connected using driver: " . strtoupper($driver);

    // 1. Table schemas
    if ($driver === 'mysql') {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `users` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `username` VARCHAR(50) NOT NULL UNIQUE,
                `password_hash` VARCHAR(255) NOT NULL,
                `level` INT NOT NULL DEFAULT 1,
                `exp` INT NOT NULL DEFAULT 0,
                `silver` INT NOT NULL DEFAULT 50000,
                `gold` INT NOT NULL DEFAULT 500,
                `stamina` INT NOT NULL DEFAULT 100,
                `vip_level` INT NOT NULL DEFAULT 0,
                `avatar_ninja_id` INT NOT NULL DEFAULT 1,
                `last_ramen_claim` BIGINT NOT NULL DEFAULT 0,
                `exam_floor` INT NOT NULL DEFAULT 1,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `master_ninjas` (
                `id` INT PRIMARY KEY,
                `name` VARCHAR(100) NOT NULL,
                `title` VARCHAR(100) NOT NULL,
                `grade` VARCHAR(5) NOT NULL,
                `element` VARCHAR(20) NOT NULL,
                `base_hp` INT NOT NULL,
                `base_atk` INT NOT NULL,
                `base_def` INT NOT NULL,
                `base_speed` INT NOT NULL,
                `special_jutsu_id` INT NOT NULL DEFAULT 0,
                `image_url` VARCHAR(255) NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE TABLE IF NOT EXISTS `master_jutsus` (
                `id` INT PRIMARY KEY,
                `name` VARCHAR(100) NOT NULL,
                `category` VARCHAR(20) NOT NULL,
                `grade` VARCHAR(5) NOT NULL,
                `trigger_rate` DECIMAL(4,2) NOT NULL DEFAULT 0.30,
                `damage_multiplier` DECIMAL(4,2) NOT NULL DEFAULT 1.50,
                `effect_type` VARCHAR(50) NOT NULL DEFAULT 'none',
                `effect_value` INT NOT NULL DEFAULT 0,
                `description` TEXT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE TABLE IF NOT EXISTS `player_ninjas` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `user_id` INT NOT NULL,
                `ninja_id` INT NOT NULL,
                `level` INT NOT NULL DEFAULT 1,
                `exp` INT NOT NULL DEFAULT 0,
                `is_main` TINYINT NOT NULL DEFAULT 0,
                `jutsu_slot_1` INT NULL,
                `jutsu_slot_2` INT NULL,
                `jutsu_slot_3` INT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (`user_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE TABLE IF NOT EXISTS `battle_logs` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `user_id` INT NOT NULL,
                `opponent_name` VARCHAR(100) NOT NULL,
                `battle_type` VARCHAR(20) NOT NULL DEFAULT 'arena',
                `is_win` TINYINT NOT NULL DEFAULT 0,
                `log_data` LONGTEXT NOT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (`user_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE TABLE IF NOT EXISTS `apk_incoming_logs` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `ip_address` VARCHAR(45) NOT NULL,
                `method` VARCHAR(10) NOT NULL,
                `endpoint` VARCHAR(255) NOT NULL,
                `headers` TEXT NULL,
                `payload` LONGTEXT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
    } else {
        // SQLite Schema
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                level INTEGER NOT NULL DEFAULT 1,
                exp INTEGER NOT NULL DEFAULT 0,
                silver INTEGER NOT NULL DEFAULT 50000,
                gold INTEGER NOT NULL DEFAULT 500,
                stamina INTEGER NOT NULL DEFAULT 100,
                vip_level INTEGER NOT NULL DEFAULT 0,
                avatar_ninja_id INTEGER NOT NULL DEFAULT 1,
                last_ramen_claim INTEGER NOT NULL DEFAULT 0,
                exam_floor INTEGER NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS master_ninjas (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                title TEXT NOT NULL,
                grade TEXT NOT NULL,
                element TEXT NOT NULL,
                base_hp INTEGER NOT NULL,
                base_atk INTEGER NOT NULL,
                base_def INTEGER NOT NULL,
                base_speed INTEGER NOT NULL,
                special_jutsu_id INTEGER NOT NULL DEFAULT 0,
                image_url TEXT
            );

            CREATE TABLE IF NOT EXISTS master_jutsus (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                grade TEXT NOT NULL,
                trigger_rate REAL NOT NULL DEFAULT 0.30,
                damage_multiplier REAL NOT NULL DEFAULT 1.50,
                effect_type TEXT NOT NULL DEFAULT 'none',
                effect_value INTEGER NOT NULL DEFAULT 0,
                description TEXT
            );

            CREATE TABLE IF NOT EXISTS player_ninjas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                ninja_id INTEGER NOT NULL,
                level INTEGER NOT NULL DEFAULT 1,
                exp INTEGER NOT NULL DEFAULT 0,
                is_main INTEGER NOT NULL DEFAULT 0,
                jutsu_slot_1 INTEGER,
                jutsu_slot_2 INTEGER,
                jutsu_slot_3 INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS battle_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                opponent_name TEXT NOT NULL,
                battle_type TEXT NOT NULL DEFAULT 'arena',
                is_win INTEGER NOT NULL DEFAULT 0,
                log_data TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS apk_incoming_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ip_address TEXT NOT NULL,
                method TEXT NOT NULL,
                endpoint TEXT NOT NULL,
                headers TEXT,
                payload TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        ");
    }

    $logs[] = "Core user/player tables verified.";

    // 2. Run Complete Authentic Game Data Ingestion (all 220 Ninjas, 349 Skills, 151 Exam Floors, etc.)
    require_once __DIR__ . '/import_all_authentic_data.php';
    $authResults = runAuthenticIngestion();
    $logs[] = "Ingested " . $authResults['total_records'] . " authentic game objects across " . $authResults['total_tables'] . " tables.";
    foreach ($authResults['records_inserted'] as $tbl => $cnt) {
        $logs[] = " - {$tbl}: {$cnt} authentic records";
    }

    return $logs;
}

// CLI or Web direct execution support
if (php_sapi_name() === 'cli' || basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'migrate.php') {
    $results = runMigration();
    if (php_sapi_name() === 'cli') {
        echo implode(PHP_EOL, $results) . PHP_EOL;
    } else {
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'logs' => $results]);
    }
}
