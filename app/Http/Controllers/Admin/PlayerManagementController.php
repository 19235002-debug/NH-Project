<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\MasterNinja;
use App\Models\PlayerNinja;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PlayerManagementController extends Controller
{
    public function index(Request $request)
    {
        $search = trim($request->get('q', ''));
        $query = User::withCount('playerNinjas');

        if ($search) {
            $query->where('username', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
        }

        $players = $query->orderBy('id', 'desc')->paginate(15)->withQueryString();
        $masterNinjas = MasterNinja::orderBy('quality', 'desc')->orderBy('name', 'asc')->get();

        return view('admin.players', compact('players', 'search', 'masterNinjas'));
    }

    public function update(Request $request, int $id)
    {
        $request->validate([
            'level' => 'required|integer|min:1|max:150',
            'vip_level' => 'required|integer|min:0|max:12',
            'silver' => 'required|integer|min:0',
            'gold' => 'required|integer|min:0',
            'stamina' => 'required|integer|min:0|max:999',
            'role' => 'required|string|in:user,admin'
        ]);

        $player = User::findOrFail($id);
        $player->level = $request->level;
        $player->vip_level = $request->vip_level;
        $player->silver = $request->silver;
        $player->gold = $request->gold;
        $player->stamina = $request->stamina;
        $player->role = $request->role;
        $player->save();

        return back()->with('success', "Data pemain {$player->username} berhasil diperbarui!");
    }

    public function toggleBan(Request $request, int $id)
    {
        $player = User::findOrFail($id);
        if ($player->id === Auth::id()) {
            return back()->with('error', 'Anda tidak dapat mem-ban akun Anda sendiri!');
        }

        $player->is_banned = !$player->is_banned;
        $player->ban_reason = $player->is_banned ? ($request->get('reason') ?: 'Ditangguhkan oleh Game Master') : null;
        $player->save();

        $action = $player->is_banned ? 'ditangguhkan (banned)' : 'diaktifkan kembali';
        return back()->with('success', "Status akun {$player->username} berhasil {$action}.");
    }

    public function addNinja(Request $request, int $id)
    {
        $request->validate([
            'ninja_id' => 'required|exists:master_ninjas,id'
        ]);

        $player = User::findOrFail($id);
        $master = MasterNinja::findOrFail($request->ninja_id);

        PlayerNinja::create([
            'user_id' => $player->id,
            'ninja_id' => $master->id,
            'level' => 1,
            'exp' => 0,
            'is_main' => 0,
            'jutsu_slot_1' => $master->special_jutsu_id ?? 1149,
            'jutsu_slot_2' => 0,
            'jutsu_slot_3' => 0
        ]);

        return back()->with('success', "Berhasil menyuntikkan Shinobi [Grade {$master->grade}] {$master->name} ke akun {$player->username}!");
    }

    public function updateNinjaLevel(Request $request, int $ninjaId)
    {
        $request->validate([
            'level' => 'required|integer|min:1|max:150'
        ]);

        $pn = PlayerNinja::findOrFail($ninjaId);
        $pn->level = (int)$request->level;
        $pn->save();

        return back()->with('success', "Level {$pn->master->name} milik {$pn->user->username} berhasil diubah ke Lv. {$pn->level}!");
    }
}
