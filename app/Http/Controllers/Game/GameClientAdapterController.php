<?php

namespace App\Http\Controllers\Game;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\PlayerNinja;
use App\Models\ServerNotice;
use App\Models\ApkIncomingLog;
use Illuminate\Http\Request;

class GameClientAdapterController extends Controller
{
    /**
     * Log incoming APK client request into apk_incoming_logs table
     */
    protected function logPacket(Request $request)
    {
        try {
            ApkIncomingLog::create([
                'method' => $request->method(),
                'endpoint' => $request->path(),
                'headers' => json_encode($request->headers->all()),
                'body' => $request->getContent() ?: json_encode($request->all()),
                'ip' => $request->ip()
            ]);
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

        $wsPort = (int) env('GAME_WS_PORT', ($hostIp === 'nh.digislams.my.id' || str_contains($hostIp, 'digislams.my.id')) ? 80 : 8080);

        $serverList = [
            [
                1,                      // 0: sid
                'S1 - Konoha Village',  // 1: server name
                $hostIp,                // 2: server IP
                $wsPort,                // 3: server Port (WebSocket game server)
                1,                      // 4: server status
                1,                      // 5: isNew
                1,                      // 6: isRecommend
                'smooth'                // 7: state tag
            ]
        ];

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
     * Ban status endpoint (/game/banStatus)
     */
    public function banStatus(Request $request)
    {
        $this->logPacket($request);
        return response()->json([
            'banned' => false,
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

        $rawAccount = trim(
            $request->input('accId', 
            $request->input('account', 
            $request->input('username', 
            $request->input('user', 
            $request->input('email', '')))))
        );
        $password = trim($request->input('pwd', $request->input('password', '123456')));

        if (empty($rawAccount)) {
            $rawAccount = 'shinobi_' . mt_rand(1000, 9999);
        }

        $user = User::where('username', $rawAccount)->orWhere('email', $rawAccount)->first();

        if (!$user) {
            $baseUsername = str_contains($rawAccount, '@') ? explode('@', $rawAccount)[0] : $rawAccount;
            $email = str_contains($rawAccount, '@') ? $rawAccount : ($rawAccount . '@ninja.local');

            $username = $baseUsername;
            if (User::where('username', $username)->exists()) {
                $username = $baseUsername . '_' . mt_rand(100, 999);
            }

            $user = User::create([
                'username' => $username,
                'email' => $email,
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                'silver' => 50000,
                'gold' => 500,
                'stamina' => 100,
                'vip_level' => 0,
                'avatar_ninja_id' => 9
            ]);

            // Starter Naruto
            PlayerNinja::create([
                'user_id' => $user->id,
                'ninja_id' => 9,
                'level' => 1,
                'exp' => 0,
                'is_main' => 1,
                'jutsu_slot_1' => 6
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
