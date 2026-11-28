<?php

namespace App\Http\Controllers\Game;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\PlayerNinja;
use App\Models\ServerNotice;
use App\Models\ApkIncomingLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GameClientAdapterController extends Controller
{
    /**
     * Log incoming APK client request into apk_incoming_logs table
     */
    protected function logPacket(Request $request)
    {
        try {
            $rawBody = $request->getContent() ?: json_encode($request->all());
            $data = [
                'method' => $request->method(),
                'endpoint' => $request->path(),
                'headers' => json_encode($request->headers->all()),
            ];
            if (\Illuminate\Support\Facades\Schema::hasColumn('apk_incoming_logs', 'ip_address')) {
                $data['ip_address'] = (string) $request->ip();
            } else {
                $data['ip'] = (string) $request->ip();
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn('apk_incoming_logs', 'payload')) {
                $data['payload'] = $rawBody;
            } else {
                $data['body'] = $rawBody;
            }
            ApkIncomingLog::create($data);
        } catch (\Exception $e) {
            // Non-blocking log failure
        }
    }

    /**
     * Client version check (/game/checkClientVersion)
     */
    public function checkClientVersion(Request $request)
    {
        $this->logPacket($request);
        return response()->json([
            'code' => 1,
            'msg' => '' // Empty string signals no update needed, proceeds directly
        ]);
    }

    /**
     * Server list (/game/servers)
     */
    public function servers(Request $request)
    {
        $this->logPacket($request);

        $hostIp = env('GAME_HOST');
        if (empty($hostIp)) {
            $host = $request->header('Host');
            $hostIp = $host ? explode(':', $host)[0] : '';
        }

        if (empty($hostIp) || in_array($hostIp, ['localhost', '127.0.0.1'])) {
            $lastSynced = base_path('.last_synced_ip');
            if (file_exists($lastSynced)) {
                $hostIp = trim(file_get_contents($lastSynced));
            }
            if (empty($hostIp)) {
                $hostIp = 'nh.digislams.my.id';
            }
        }

        $wsPort = ($hostIp === 'nh.digislams.my.id' || str_contains($hostIp, 'digislams.my.id'))
            ? (int) env('GAME_PUBLIC_WS_PORT', 80)
            : (int) env('GAME_WS_PORT', 8080);

        $serverList = [];
        try {
            $dbServers = DB::table('game_servers')->orderBy('id', 'asc')->get();
            foreach ($dbServers as $srv) {
                $srvHost = $srv->host ?: $hostIp;
                $srvPort = (int) ($srv->port ?: $wsPort);
                if (($srvHost === 'nh.digislams.my.id' || str_contains($srvHost, 'digislams.my.id')) && $srvPort === 8080) {
                    $srvPort = 80;
                }
                $serverList[] = [
                    (int) $srv->id,
                    $srv->name,
                    $srvHost,
                    $srvPort,
                    (int) $srv->status,
                    (int) $srv->is_new,
                    (int) $srv->is_recommend,
                    $srv->state_tag ?: 'smooth',
                ];
            }
        } catch (\Exception $eSrv) {
            // Table game_servers may not exist yet; fall back to default S1 server
        }

        if (empty($serverList)) {
            $serverList = [
                [
                    1,
                    'S1 - Konoha Village',
                    $hostIp,
                    $wsPort,
                    1,
                    1,
                    1,
                    'smooth',
                ]
            ];
        }

        $encoded = base64_encode(json_encode($serverList));

        return response()->json([
            'code' => 1,
            'msg' => $encoded,
            't' => $encoded
        ]);
    }

    /**
     * In-game Notice endpoint (/notice, /game/notice)
     */
    public function notice(Request $request)
    {
        $this->logPacket($request);
        $activeNotice = ServerNotice::where('is_active', 1)->latest('id')->first();

        $title = $activeNotice->title ?? 'Ninja Heroes Private Server';
        $content = $activeNotice->content ?? 'Selamat datang di Private Server Ninja Heroes Lokal! Nikmati nostalgia pertarungan shinobi.';
        $rewardGold = $activeNotice ? (int) $activeNotice->reward_gold : 0;

        if ($rewardGold > 0) {
            $content = "[🎁 REWARD: +" . number_format($rewardGold) . " GOLD]\n" . $content . "\n(Klaim hadiah Gold di Web Portal Shinobi)";
        }

        return response()->json([
            'code' => 1,
            'title' => $title,
            'content' => $content,
            'reward_gold' => $rewardGold,
            'time' => now()->timezone('Asia/Jakarta')->format('Y-m-d H:i:s')
        ]);
    }

    /**
     * Combo / Deploy RoleGroup sync endpoint (/game/rolegroup)
     */
    public function rolegroup(Request $request)
    {
        $this->logPacket($request);

        $rows = [];
        try {
            $dbGroups = DB::table('master_role_groups')->orderBy('id', 'asc')->get();
            foreach ($dbGroups as $g) {
                $item = [
                    'id' => (int) $g->id,
                    'name' => (string) $g->name,
                    'desc' => (string) ($g->description ?? ''),
                    'roles' => (string) $g->roles,
                ];
                if (!empty($g->alter_self)) {
                    $item['alterSelf'] = (string) $g->alter_self;
                }
                if (!empty($g->skill_id) && (int) $g->skill_id > 0) {
                    $item['skill'] = (int) $g->skill_id;
                }
                $rows[] = $item;
            }
        } catch (\Exception $eRg) {
            // Fallback to static RoleGroup.js table if DB query fails
        }

        if (empty($rows)) {
            $rgFile = public_path('gamedata_emu/nh-ota/releases/1.0.0/UI/tables/RoleGroup.js');
            if (file_exists($rgFile)) {
                $txt = file_get_contents($rgFile);
                $s = strpos($txt, '[');
                $e = strrpos($txt, ']');
                if ($s !== false && $e !== false && $e > $s) {
                    $decoded = json_decode(substr($txt, $s, $e - $s + 1), true);
                    if (is_array($decoded)) {
                        $rows = $decoded;
                    }
                }
            }
        }

        return response()->json([
            'code' => 0,
            'rev' => count($rows),
            'rows' => $rows,
        ]);
    }

    /**
     * Ban status endpoint (/game/banStatus)
     */
    public function banStatus(Request $request)
    {
        $this->logPacket($request);

        $authHeader = (string) $request->header('Authorization', '');
        if (str_starts_with($authHeader, 'Bearer ')) {
            $token = trim(substr($authHeader, 7));
            if ($token !== '') {
                try {
                    $user = User::where('remember_token', $token)->first();
                    if ($user && $user->is_banned) {
                        $reason = $user->ban_reason ?: 'Melanggar peraturan game.';
                        $msg = "Akun Anda di-banned: {$reason}";
                        return response()->json([
                            'state' => 'banned',
                            'banned' => true,
                            'msg' => $msg,
                            'notice' => $msg,
                        ]);
                    }
                } catch (\Exception $eBan) {}
            }
        }

        return response()->json([
            'state' => 'ok',
            'banned' => false,
            'msg' => '',
            'notice' => ''
        ]);
    }

    /**
     * Create Role endpoint (/game/createRole)
     */
    public function createRole(Request $request)
    {
        $this->logPacket($request);
        $roleName = $request->input('roleName', $request->input('name', 'Shinobi'));

        return response()->json([
            'code' => 1,
            'msg' => json_encode(['success' => true, 'roleName' => $roleName])
        ]);
    }

    /**
     * Mobile APK Login & Register endpoints (/game/login, /game/lyto/login, /game/register)
     */
    public function handleAuth(Request $request)
    {
        $this->logPacket($request);

        // Also parse raw body if sent without form Content-Type header
        $extraParams = [];
        $rawContent = trim((string) $request->getContent());
        if ($rawContent !== '') {
            $jsonBody = json_decode($rawContent, true);
            if (is_array($jsonBody)) {
                $extraParams = $jsonBody;
            } else {
                parse_str($rawContent, $extraParams);
            }
        }

        $getParam = function (array $keys, string $default = '') use ($request, $extraParams): string {
            foreach ($keys as $k) {
                $v = $request->input($k);
                if ($v !== null && trim((string) $v) !== '') {
                    return trim((string) $v);
                }
                if (isset($extraParams[$k]) && trim((string) $extraParams[$k]) !== '') {
                    return trim((string) $extraParams[$k]);
                }
            }
            return $default;
        };

        $rawAccount = $getParam(['accId', 'account', 'username', 'user', 'email', 'name']);
        $password = $getParam(['pwd', 'password', 'pass', 'passwd']);

        if (empty($rawAccount) || empty($password)) {
            return response()->json([
                'code' => -1,
                'msg' => 'Username/Email and password are required.',
            ]);
        }

        $isRegisterRoute = str_contains($request->path(), 'register');
        $lowerAcc = strtolower($rawAccount);
        $user = User::whereRaw('LOWER(username) = ?', [$lowerAcc])
            ->orWhereRaw('LOWER(email) = ?', [$lowerAcc])
            ->first();

        if (!$user && str_contains($lowerAcc, '@')) {
            // Also try matching local-part before '@' against username if email column was null/different
            $localPart = explode('@', $lowerAcc)[0];
            $cand = User::whereRaw('LOWER(username) = ?', [$localPart])->first();
            if ($cand && (empty($cand->email) || str_ends_with(strtolower((string) $cand->email), '@ninja.local') || str_ends_with(strtolower((string) $cand->email), '@shinobi.nh'))) {
                $user = $cand;
            }
        }

        if (!$user && $isRegisterRoute) {
            try {
                $isPlain = !(strlen($password) === 32 && ctype_xdigit($password));
                $plainOrHash = password_hash($password, PASSWORD_BCRYPT);
                $md5Val = $isPlain ? md5($password) : strtolower($password);
                $lowerMd5Val = $isPlain ? md5(strtolower($password)) : strtolower($password);
                $emailVal = str_contains($rawAccount, '@') ? $rawAccount : ($rawAccount . '@shinobi.nh');

                $user = User::create([
                    'username' => $rawAccount,
                    'email' => $emailVal,
                    'password_hash' => $plainOrHash,
                    'role' => 'user',
                    'level' => 1,
                    'exp' => 0,
                    'gold' => 500,
                    'silver' => 50000,
                    'stamina' => 100,
                ]);
                try {
                    if (!\Illuminate\Support\Facades\Schema::hasColumn('users', 'password_lower_md5')) {
                        DB::statement('ALTER TABLE users ADD COLUMN password_lower_md5 VARCHAR(32) NULL');
                    }
                    DB::table('users')->where('id', $user->id)->update([
                        'password_md5' => $md5Val,
                        'password_lower_md5' => $lowerMd5Val,
                    ]);
                } catch (\Exception $eCol) {}
                $user->refresh();
            } catch (\Exception $eReg) {
                return response()->json([
                    'code' => -2,
                    'msg' => 'Gagal mendaftarkan akun baru: ' . $rawAccount,
                ]);
            }
        }

        $validPassword = false;
        if ($user) {
            $storedHash = (string) $user->password_hash;
            $storedMd5 = strtolower((string) ($user->password_md5 ?? ''));
            $storedLowerMd5 = strtolower((string) ($user->password_lower_md5 ?? ''));
            $pwdMd5 = md5($password);
            $pwdLowerMd5 = md5(strtolower($password));

            if ($storedHash !== '' && (password_verify($password, $storedHash) || password_verify(strtolower($password), $storedHash))) {
                $validPassword = true;
            } elseif ($storedMd5 !== '' && (hash_equals($storedMd5, $pwdMd5) || hash_equals($storedMd5, $pwdLowerMd5))) {
                $validPassword = true;
            } elseif ($storedLowerMd5 !== '' && (hash_equals($storedLowerMd5, $pwdMd5) || hash_equals($storedLowerMd5, $pwdLowerMd5))) {
                $validPassword = true;
            } elseif (strlen($password) === 32 && ctype_xdigit($password)) {
                $hexPwd = strtolower($password);
                if (($storedMd5 !== '' && hash_equals($storedMd5, $hexPwd)) || ($storedLowerMd5 !== '' && hash_equals($storedLowerMd5, $hexPwd))) {
                    $validPassword = true;
                }
            }
        }

        if (!$user || !$validPassword) {
            return response()->json([
                'code' => -1,
                'msg' => 'Account does not exist or incorrect password',
            ]);
        }

        if ($user->is_banned) {
            $reason = $user->ban_reason ?: 'Melanggar peraturan game.';
            return response()->json([
                'code' => -2,
                'msg' => "Akun Anda di-banned: {$reason}",
            ]);
        }

        $token = 'tok_' . bin2hex(random_bytes(16));
        try {
            $user->update(['remember_token' => $token]);
        } catch (\Exception $eToken) {}

        // Persist active login session cache for WebSocket game server
        try {
            $lastLoginPayload = json_encode([
                'username' => $user->username,
                'user_id' => $user->id,
                'time' => time(),
                'ip' => $request->ip()
            ]);
            @file_put_contents(base_path('storage/last_login.json'), $lastLoginPayload);
            @file_put_contents(base_path('.last_login'), $lastLoginPayload);
        } catch (\Exception $eLL) {}

        $payloadData = [
            'sgin' => $token,
            'account' => $user->username,
            'uid' => $user->id,
            'server_time' => time(),
            'servers' => [1]
        ];

        $jsonMsg = json_encode($payloadData);
        return response()->json([
            'code' => 1,
            'msg' => $jsonMsg,
            't' => $jsonMsg,
            'sgin' => $token,
            'account' => $user->username,
            'uid' => $user->id,
            'servers' => [1]
        ]);
    }

    /**
     * Native C++ Version Check (/game/version)
     * Format: <version>#<bytes_size>
     */
    public function version(Request $request)
    {
        $this->logPacket($request);
        $v = $request->input('v', '1.1.1');
        return response($v . '#0', 200, [
            'Content-Type' => 'text/plain; charset=utf-8'
        ]);
    }

    /**
     * Channel Update Check (/game/isUpdateLytoByChannel)
     */
    public function isUpdateLytoByChannel(Request $request)
    {
        $this->logPacket($request);
        return response('0', 200, [
            'Content-Type' => 'text/plain; charset=utf-8'
        ]);
    }

    /**
     * Fallback for any other game client route
     */
    public function fallback(Request $request)
    {
        $this->logPacket($request);
        return response()->json([
            'code' => 1,
            'msg' => 'ok'
        ]);
    }
}
