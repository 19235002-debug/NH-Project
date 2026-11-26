<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ServerManagementController extends Controller
{
    public function index()
    {
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

