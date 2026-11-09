<?php

namespace App\Http\Controllers\Player;

use App\Http\Controllers\Controller;
use App\Models\PlayerNinja;
use App\Models\MasterRoleGroup;
use App\Models\MasterJutsu;
use App\Models\PlayerJutsu;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TeamController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        // 1. Load all player ninjas with master and all 7 jutsu slot relations
        $ninjas = PlayerNinja::with([
                'master.specialJutsu', 
                'jutsu1', 'jutsu2', 'jutsu3', 'jutsu4', 'jutsu5', 
                'summonJutsu', 'bijuJutsu'
            ])
            ->where('user_id', $user->id)
            ->get();

        // Auto-assign slot 1 if user has ninjas but slot 1 is empty
        $slot1 = $ninjas->firstWhere('is_main', 1);
        $slot2 = $ninjas->firstWhere('is_main', 2);
        $slot3 = $ninjas->firstWhere('is_main', 3);

        if (!$slot1 && $ninjas->isNotEmpty()) {
            $sorted = $ninjas->sortByDesc(fn($n) => ($n->master->quality ?? 0) * 1000 + $n->level);
            $top1 = $sorted->first();
            $top1->is_main = 1;
            $top1->deploy_slot = 0;
            $top1->save();
            $slot1 = $top1;

            $user->avatar_ninja_id = $top1->ninja_id;
            $user->save();
        }

        // Auto-assign slot 2 and 3 if available and empty
        if (!$slot2 && $ninjas->count() >= 2) {
            $candidate2 = $ninjas->whereNotIn('id', [$slot1 ? $slot1->id : 0])
                ->where('is_main', 0)
                ->where('deploy_slot', 0)
                ->sortByDesc(fn($n) => ($n->master->quality ?? 0) * 1000 + $n->level)
                ->first();
            if ($candidate2) {
                $candidate2->is_main = 2;
                $candidate2->save();
                $slot2 = $candidate2;
            }
        }

        if (!$slot3 && $ninjas->count() >= 3) {
            $assignedIds = array_filter([$slot1 ? $slot1->id : 0, $slot2 ? $slot2->id : 0]);
            $candidate3 = $ninjas->whereNotIn('id', $assignedIds)
                ->where('is_main', 0)
                ->where('deploy_slot', 0)
                ->sortByDesc(fn($n) => ($n->master->quality ?? 0) * 1000 + $n->level)
                ->first();
            if ($candidate3) {
                $candidate3->is_main = 3;
                $candidate3->save();
                $slot3 = $candidate3;
            }
        }

        // Re-query sorted list: Combat slots (1, 2, 3), then Deploy slots (1-8), then reserves
        $ninjas = PlayerNinja::with(['master.specialJutsu', 'jutsu1', 'jutsu2', 'jutsu3'])
            ->where('user_id', $user->id)
            ->orderByRaw("
                CASE 
                    WHEN is_main IN (1, 2, 3) THEN is_main
                    WHEN deploy_slot > 0 THEN 10 + deploy_slot
                    ELSE 99 
                END ASC
            ")
            ->orderBy('level', 'desc')
            ->get();

        $slot1 = $ninjas->firstWhere('is_main', 1);
        $slot2 = $ninjas->firstWhere('is_main', 2);
        $slot3 = $ninjas->firstWhere('is_main', 3);

        // 2. Deploy Board (12 Support Slots)
        $deploySlots = [];
        for ($s = 1; $s <= 12; $s++) {
            $deploySlots[$s] = $ninjas->firstWhere('deploy_slot', $s);
        }

        // 3. Combo Skill Evaluation
        // In Ninja Heroes, combo skills check ninjas in Combat Team (mars) OR Deploy Board (aids)
        $combatMasterIds = $ninjas
            ->whereIn('is_main', [1, 2, 3])
            ->pluck('ninja_id')
            ->unique()
            ->toArray();

        $deployMasterIds = $ninjas
            ->where('deploy_slot', '>', 0)
            ->pluck('ninja_id')
            ->unique()
            ->toArray();

        $activeMasterIds = array_values(array_unique(array_merge($combatMasterIds, $deployMasterIds)));
        $ownedMasterIds = $ninjas->pluck('ninja_id')->unique()->toArray();

        $allCombos = MasterRoleGroup::all();
        $activeCombos = [];
        $potentialCombos = [];

        $bonusStats = [
            'atk' => 0,
            'def' => 0,
            'hp' => 0,
            'speed' => 0,
            'backup_attacks' => 0
        ];

        foreach ($allCombos as $combo) {
            $reqRoles = $combo->role_ids;
            if (empty($reqRoles)) continue;

            $matchedActive = array_intersect($reqRoles, $activeMasterIds);
            $countActive = count($matchedActive);
            $totalReq = count($reqRoles);

            if ($countActive === $totalReq) {
                // Combo is Fully Active!
                $activeCombos[] = [
                    'combo' => $combo,
                    'roles' => $combo->masterNinjas()
                ];

                // 100% authentic stat buff extraction from alter_self & description
                $st = $combo->parsed_stats;
                $bonusStats['atk'] += $st['atk'];
                $bonusStats['def'] += $st['def'];
                $bonusStats['hp'] += $st['hp'];
                $bonusStats['speed'] += $st['speed'];
                if ($st['backup_attack']) {
                    $bonusStats['backup_attacks']++;
                }
            } else {
                // Check if player has at least 1 role in collection
                $matchedOwned = array_intersect($reqRoles, $ownedMasterIds);
                if (count($matchedOwned) > 0) {
                    $potentialCombos[] = [
                        'combo' => $combo,
                        'matched_count' => $countActive,
                        'total_count' => $totalReq,
                        'roles' => $combo->masterNinjas(),
                        'has_all_in_roster' => (count($matchedOwned) === $totalReq)
                    ];
                }
            }
        }

        // Sort potential combos: those with highest match percentage first
        usort($potentialCombos, fn($a, $b) => ($b['matched_count'] / $b['total_count']) <=> ($a['matched_count'] / $a['total_count']));

        // Calculate Team Combat Power with Combo Buff Multiplier
        $baseTeamCp = ($slot1 ? $slot1->combat_power : 0) +
                      ($slot2 ? $slot2->combat_power : 0) +
                      ($slot3 ? $slot3->combat_power : 0);

        $comboBonusMultiplier = 1.0 + (
            ($bonusStats['atk'] * 0.01) + 
            ($bonusStats['def'] * 0.01) + 
            ($bonusStats['hp'] * 0.01) + 
            ($bonusStats['speed'] * 0.01)
        );

        $totalTeamCp = (int)($baseTeamCp * $comboBonusMultiplier);

        // Player jutsu inventory
        $playerJutsus = PlayerJutsu::where('user_id', $user->id)
            ->with('jutsu')
            ->get();

        return view('player.team', compact(
            'user', 
            'ninjas', 
            'slot1', 
            'slot2', 
            'slot3', 
            'deploySlots', 
            'activeCombos', 
            'potentialCombos', 
            'bonusStats', 
            'totalTeamCp',
            'combatMasterIds',
            'deployMasterIds',
            'ownedMasterIds',
            'playerJutsus'
        ));
    }

    public function assignSlot(Request $request, int $id, int $slot)
    {
        if (!in_array($slot, [1, 2, 3])) {
            return back()->with('error', 'Nomor slot formasi tidak valid (pilih Slot 1, 2, atau 3).');
        }

        $user = Auth::user();
        $target = PlayerNinja::where('user_id', $user->id)->where('id', $id)->firstOrFail();

        // Clear whoever is currently in $slot
        PlayerNinja::where('user_id', $user->id)
            ->where('is_main', $slot)
            ->update(['is_main' => 0]);

        // If target was in deploy board, clear deploy slot
        $target->deploy_slot = 0;
        $target->is_main = $slot;
        $target->save();

        if ($slot === 1) {
            $user->avatar_ninja_id = $target->ninja_id;
            $user->save();
        }

        $slotNames = [
            1 => 'Slot 1 (Leader / Vanguard)',
            2 => 'Slot 2 (Mid Combatant)',
            3 => 'Slot 3 (Rear Anchor)'
        ];

        return back()->with('success', "⭐ {$target->master->name} berhasil dipasang di {$slotNames[$slot]}!");
    }

    public function setMain(int $id)
    {
        return $this->assignSlot(request(), $id, 1);
    }

    public function removeSlot(int $id)
    {
        $user = Auth::user();
        $target = PlayerNinja::where('user_id', $user->id)->where('id', $id)->firstOrFail();

        $deployedCount = PlayerNinja::where('user_id', $user->id)
            ->whereIn('is_main', [1, 2, 3])
            ->count();

        if ($deployedCount <= 1 && $target->isDeployed()) {
            return back()->with('error', 'Tim tempur harus memiliki minimal 1 Shinobi aktif!');
        }

        $oldSlot = $target->is_main;
        $target->is_main = 0;
        $target->save();

        if ($oldSlot === 1) {
            $next = PlayerNinja::where('user_id', $user->id)
                ->whereIn('is_main', [2, 3])
                ->orderBy('is_main', 'asc')
                ->first();
            if ($next) {
                $next->is_main = 1;
                $next->save();
                $user->avatar_ninja_id = $next->ninja_id;
                $user->save();
            }
        }

        return back()->with('success', "{$target->master->name} berhasil dilepas dari formasi tempur ke cadangan.");
    }

    public function assignDeploy(Request $request, int $id, int $slot)
    {
        if ($slot < 1 || $slot > 12) {
            return back()->with('error', 'Nomor slot Deploy tidak valid (pilih Slot 1 sampai 12).');
        }

        $user = Auth::user();
        $target = PlayerNinja::where('user_id', $user->id)->where('id', $id)->firstOrFail();

        // Clear whoever is currently in that deploy slot
        PlayerNinja::where('user_id', $user->id)
            ->where('deploy_slot', $slot)
            ->update(['deploy_slot' => 0]);

        // If target was in combat formation, remove from combat formation
        $target->is_main = 0;
        $target->deploy_slot = $slot;
        $target->save();

        return back()->with('success', "🛡️ {$target->master->name} berhasil ditempatkan di Papan Deploy Slot D{$slot}! Sinergi Combo Skill telah diperbarui.");
    }

    public function removeDeploy(int $id)
    {
        $user = Auth::user();
        $target = PlayerNinja::where('user_id', $user->id)->where('id', $id)->firstOrFail();

        $target->deploy_slot = 0;
        $target->save();

        return back()->with('success', "{$target->master->name} berhasil dilepas dari Papan Deploy ke cadangan.");
    }

    public function equipJutsu(Request $request, int $id)
    {
        $request->validate([
            'slot_type' => 'required|string|in:slot1,slot2,slot3,slot4,slot5,summon,biju',
            'jutsu_id' => 'required|integer|exists:master_jutsus,id'
        ]);

        $user = Auth::user();
        $target = PlayerNinja::where('user_id', $user->id)->where('id', $id)->firstOrFail();
        $jutsu = MasterJutsu::findOrFail($request->jutsu_id);
        $slotType = $request->slot_type;

        // Slot 5 is exclusive to VIP 3+
        if ($slotType === 'slot5' && $user->vip_level < 3) {
            return back()->with('error', 'Slot Ninjutsu ke-5 hanya terbuka untuk akun VIP 3 atau lebih tinggi!');
        }

        switch ($slotType) {
            case 'slot1': $target->jutsu_slot_1 = $jutsu->id; break;
            case 'slot2': $target->jutsu_slot_2 = $jutsu->id; break;
            case 'slot3': $target->jutsu_slot_3 = $jutsu->id; break;
            case 'slot4': $target->jutsu_slot_4 = $jutsu->id; break;
            case 'slot5': $target->jutsu_slot_5 = $jutsu->id; break;
            case 'summon': $target->summon_jutsu_id = $jutsu->id; break;
            case 'biju': $target->biju_jutsu_id = $jutsu->id; break;
        }

        $target->save();

        return back()->with('success', "✨ Jutsu {$jutsu->name} ({$jutsu->grade}-Rank) berhasil dipasang pada {$target->master->name}!");
    }

    public function unequipJutsu(Request $request, int $id, string $slotType)
    {
        $user = Auth::user();
        $target = PlayerNinja::where('user_id', $user->id)->where('id', $id)->firstOrFail();

        switch ($slotType) {
            case 'slot1': $target->jutsu_slot_1 = null; break;
            case 'slot2': $target->jutsu_slot_2 = null; break;
            case 'slot3': $target->jutsu_slot_3 = null; break;
            case 'slot4': $target->jutsu_slot_4 = null; break;
            case 'slot5': $target->jutsu_slot_5 = null; break;
            case 'summon': $target->summon_jutsu_id = null; break;
            case 'biju': $target->biju_jutsu_id = null; break;
        }

        $target->save();

        return back()->with('success', "Jutsu berhasil dicopot dari {$target->master->name}.");
    }

    public function upgrade(Request $request, int $id)
    {
        $user = Auth::user();
        $ninja = PlayerNinja::where('user_id', $user->id)->where('id', $id)->firstOrFail();

        // Max Hero Level in authentic APK = 150
        if ($ninja->level >= 150) {
            return back()->with('info', "Shinobi ini telah mencapai level maksimal (Lv 150).");
        }

        $cost = $ninja->level * 1000;
        if ($user->silver < $cost) {
            return back()->with('error', "Silver tidak cukup. Diperlukan " . number_format($cost) . " Silver untuk naik ke Level " . ($ninja->level + 1));
        }

        $user->silver -= $cost;
        $user->save();

        $ninja->level += 1;
        $ninja->save();

        return back()->with('success', "Level {$ninja->master->name} berhasil dinaikkan ke Level {$ninja->level} / 150!");
    }
}
