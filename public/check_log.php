<?php
header('Content-Type: text/plain');

echo "=== Process Check ===\n";
echo @shell_exec('ps aux | grep game_server | grep -v grep') ?: "No running game_server process found.\n";

echo "\n=== .game_port ===\n";
echo file_exists('../.game_port') ? file_get_contents('../.game_port') : "no .game_port file\n";

echo "\n=== Port Tests (Localhost) ===\n";
foreach ([18080, 28080, 38080, 8080, 6001] as $port) {
    $fp = @fsockopen('127.0.0.1', $port, $errno, $errstr, 0.5);
    if ($fp) {
        echo "Port $port: OPEN (Process is listening!)\n";
        fclose($fp);
    } else {
        echo "Port $port: Closed ($errstr)\n";
    }
}

echo "\n=== game_server.log ===\n";
echo file_exists('../game_server.log') ? file_get_contents('../game_server.log') : "no game_server.log\n";

echo "\n=== public/.htaccess (first 15 lines) ===\n";
if (file_exists('.htaccess')) {
    $lines = array_slice(file('.htaccess'), 0, 15);
    echo implode('', $lines);
}
