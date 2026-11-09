<?php
// Direct standalone Cocos2d-x version handler
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$v = isset($_GET['v']) ? trim($_GET['v']) : '1.1.1';
if (empty($v)) {
    $v = '1.1.1';
}

// Cocos2d-x native format: <version>#<bytes_size>
// #0 indicates no patch files needed (up to date)
echo $v . '#0';
exit;
