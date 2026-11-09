<?php
$log = file_exists('../game_server.log') ? file_get_contents('../game_server.log') : 'no log file';
$port = file_exists('../.game_port') ? file_get_contents('../.game_port') : 'no port file';
header('Content-Type: text/plain');
echo "=== .game_port ===\n" . $port . "\n\n=== game_server.log ===\n" . $log;
