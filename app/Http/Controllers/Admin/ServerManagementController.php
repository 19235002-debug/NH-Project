<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ServerManagementController extends Controller
{
    private function ensureTables()
    {
        DB::statement("CREATE TABLE IF NOT EXISTS `game_servers` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `name` VARCHAR(100) NOT NULL,
            `host` VARCHAR(100) NOT NULL DEFAULT '127.0.0.1',
            `port` INT NOT NULL DEFAULT 8080,
            `status` TINYINT NOT NULL DEFAULT 1,
            `is_new` TINYINT NOT NULL DEFAULT 1,
            `is_recommend` TINYINT NOT NULL DEFAULT 1,
            `state_tag` VARCHAR(20) NOT NULL DEFAULT 'smooth',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        DB::statement("CREATE TABLE IF NOT EXISTS `server_players` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `user_id` INT NOT NULL,
            `server_id` INT NOT NULL,
            `player_name` VARCHAR(100) DEFAULT NULL,
            `level` INT NOT NULL DEFAULT 1,
            `exp` INT NOT NULL DEFAULT 0,
            `silver` BIGINT NOT NULL DEFAULT 50000,
            `gold` BIGINT NOT NULL DEFAULT 500,
            `stamina` INT NOT NULL DEFAULT 100,
            `vip_level` INT NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY `uniq_user_server` (`user_id`, `server_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        if (DB::table('game_servers')->count() === 0) {
            DB::table('game_servers')->insert([
                'id' => 1,
                'name' => 'S1 - Konoha Village',
                'host' => 'nh.digislams.my.id',
                'port' => 18080,
                'status' => 1,
                'is_new' => 1,
                'is_recommend' => 1,
                'state_tag' => 'smooth',
                'created_at' => now(),
            ]);
        }
    }

    public function index()
    {
        $this->ensureTables();
        $servers = DB::table('game_servers')
            ->leftJoin('server_players', 'game_servers.id', '=', 'server_players.server_id')
            ->select(
                'game_servers.*',
                DB::raw('COUNT(server_players.id) as player_count')
            )
            ->groupBy(
                'game_servers.id',
                'game_servers.name',
                'game_servers.host',
                'game_servers.port',
                'game_servers.status',
                'game_servers.is_new',
                'game_servers.is_recommend',
                'game_servers.state_tag',
                'game_servers.created_at'
            )
            ->orderBy('game_servers.id', 'asc')
            ->get();

        $serverPlayers = DB::table('server_players')
            ->join('users', 'server_players.user_id', '=', 'users.id')
            ->join('game_servers', 'server_players.server_id', '=', 'game_servers.id')
            ->select(
                'server_players.*',
                'users.username',
                'game_servers.name as server_name'
            )
            ->orderBy('server_players.server_id', 'asc')
            ->orderBy('server_players.id', 'desc')
            ->limit(50)
            ->get();

        return view('admin.servers', compact('servers', 'serverPlayers'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'host' => 'required|string|max:100',
            'port' => 'required|integer|min:1|max:65535',
            'state_tag' => 'required|in:smooth,hot,new,busy,maintenance',
            'is_new' => 'nullable|boolean',
            'is_recommend' => 'nullable|boolean',
        ]);

        DB::table('game_servers')->insert([
            'name' => $validated['name'],
            'host' => $validated['host'],
            'port' => (int) $validated['port'],
            'status' => 1,
            'is_new' => $request->has('is_new') ? 1 : 0,
            'is_recommend' => $request->has('is_recommend') ? 1 : 0,
            'state_tag' => $validated['state_tag'],
            'created_at' => now(),
        ]);

        return redirect()->route('admin.servers')->with('success', 'Server baru berhasil ditambahkan!');
    }

    public function toggle($id)
    {
        $server = DB::table('game_servers')->where('id', $id)->first();
        if ($server) {
            DB::table('game_servers')->where('id', $id)->update([
                'status' => $server->status ? 0 : 1,
            ]);
        }

        return redirect()->route('admin.servers')->with('success', 'Status server diperbarui!');
    }

    public function destroy($id)
    {
        if ((int) $id === 1) {
            return redirect()->route('admin.servers')->with('error', 'Server utama S1 tidak dapat dihapus!');
        }

        DB::table('server_players')->where('server_id', $id)->delete();
        DB::table('game_servers')->where('id', $id)->delete();

        return redirect()->route('admin.servers')->with('success', 'Server berhasil dihapus!');
    }
}

