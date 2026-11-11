<?php
header('Content-Type: text/plain');

echo "=== Process Check ===\n";
echo @shell_exec('ps aux | grep game_server | grep -v grep') ?: "No running game_server process found.\n";

echo "\n=== .game_port ===\n";
echo file_exists('../.game_port') ? file_get_contents('../.game_port') : "no .game_port file\n";

echo "\n=== Database Users Check ===\n";
try {
    $env = parse_ini_file('../.env');
    $pdo = new PDO(
        "mysql:host=" . ($env['DB_HOST'] ?? '127.0.0.1') . ";dbname=" . ($env['DB_DATABASE'] ?? 'digisla3_ninja'),
        $env['DB_USERNAME'] ?? 'root',
        $env['DB_PASSWORD'] ?? ''
    );
    $cols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
    echo "Columns in users table: " . implode(', ', $cols) . "\n";
    
    $users = $pdo->query("SELECT id, username, email, level, gold, silver, stamina, vip_level, map_chapter, map_stage FROM users ORDER BY id DESC LIMIT 10")->fetchAll(PDO::FETCH_ASSOC);
    echo "Recent 10 users:\n";
    foreach ($users as $u) {
        echo json_encode($u) . "\n";
    }

    $logs = $pdo->query("SELECT id, method, endpoint, body, created_at FROM apk_incoming_logs ORDER BY id DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
    echo "\nRecent 5 APK Incoming Logs:\n";
    foreach ($logs as $l) {
        echo json_encode($l) . "\n";
    }
} catch (Exception $e) {
    echo "DB error: " . $e->getMessage() . "\n";
}

echo "\n=== game_server.log (last 20 lines) ===\n";
if (file_exists('../game_server.log')) {
    $lines = file('../game_server.log');
    echo implode('', array_slice($lines, -20));
}

