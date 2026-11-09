<?php

namespace App\Http\Controllers\Player;

use App\Http\Controllers\Controller;
use App\Models\MasterExam;
use App\Models\PlayerNinja;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ArenaController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $user->load(['mainNinja.master', 'mainNinja.jutsu1']);

        $deployedNinjas = $user->deployedNinjas()->with(['master.specialJutsu'])->get();

        $currentFloor = $user->exam_floor ?: 1;
        // Display floors around user floor
        $floors = MasterExam::with('enemy')
            ->where('floor', '<=', max(10, $currentFloor + 4))
            ->orderBy('floor', 'asc')
            ->get();

        return view('player.arena', compact('user', 'floors', 'currentFloor', 'deployedNinjas'));
    }

    public function challenge(Request $request, int $floor)
    {
        $user = Auth::user();

        // Load 3 deployed battle formation ninjas
        $teamNinjas = $user->deployedNinjas()->with(['master.specialJutsu'])->get();

        if ($teamNinjas->isEmpty()) {
            if ($user->mainNinja) {
                $teamNinjas = collect([$user->mainNinja]);
            } else {
                return back()->with('error', 'Silakan pilih Shinobi aktif di tab Shinobi Team sebelum menantang Ujian!');
            }
        }

        if ($user->stamina < 10) {
            return back()->with('error', 'Stamina tidak mencukupi (diperlukan minimal 10 Stamina). Silakan klaim Ramen Ichiraku!');
        }

        $exam = MasterExam::with('enemy')->where('floor', $floor)->firstOrFail();

        // Prepare Boss Stats (scaled based on floor and difficulty)
        $enemyMaster = $exam->enemy;
        $diffMultiplier = max(1.0, 1.0 + (($floor - 1) * 0.12));
        $bossHp = (int)(($enemyMaster ? $enemyMaster->base_hp : 600) * $diffMultiplier);
        $bossAtk = (int)(($enemyMaster ? $enemyMaster->base_atk : 120) * $diffMultiplier);
        $bossDef = (int)(($enemyMaster ? $enemyMaster->base_def : 90) * $diffMultiplier);
        $bossName = $exam->enemy_name ?: ($enemyMaster ? $enemyMaster->name : "Ninja Guardian Lv.{$floor}");

        // Battle Simulation (3-Ninja Tag Team Progression)
        $battleLogs = [];
        $curBossHp = $bossHp;
        $round = 1;
        $playerWon = false;

        $ninjaIdx = 0;
        $activeNinja = $teamNinjas[$ninjaIdx];
        $curPlayerHp = $activeNinja->hp;

        $battleLogs[] = [
            "round" => 0,
            "actions" => [
                "⚔️ Pertarungan dimulai! Formasi Tim Shinobi ({$teamNinjas->count()} Ninja) bersiap menghadapi {$bossName}!"
            ]
        ];

        while ($round <= 30 && $curBossHp > 0 && $ninjaIdx < $teamNinjas->count()) {
            $roundLog = ["round" => $round, "actions" => []];
            $playerName = $activeNinja->master->name ?? 'Shinobi';
            $playerAtk = $activeNinja->atk;
            $playerDef = $activeNinja->def;
            $playerSpeed = $activeNinja->speed;

            $playerGoesFirst = ($playerSpeed >= 100);

            if ($playerGoesFirst) {
                // Player turn
                $dmgToBoss = max(15, (int)(($playerAtk * 1.5) - ($bossDef * 0.4)) + mt_rand(-10, 15));
                $curBossHp = max(0, $curBossHp - $dmgToBoss);
                $roundLog["actions"][] = "[Slot " . ($ninjaIdx + 1) . "] {$playerName} menyerang {$bossName} dengan pukulan chakra! Menghasilkan {$dmgToBoss} DMG. [Sisa HP Boss: {$curBossHp}]";

                if ($curBossHp <= 0) {
                    $playerWon = true;
                    $roundLog["actions"][] = "🏆 {$bossName} berhasil ditumbangkan oleh {$playerName}!";
                    $battleLogs[] = $roundLog;
                    break;
                }

                // Boss turn
                $dmgToPlayer = max(10, (int)(($bossAtk * 1.4) - ($playerDef * 0.45)) + mt_rand(-8, 12));
                $curPlayerHp = max(0, $curPlayerHp - $dmgToPlayer);
                $roundLog["actions"][] = "{$bossName} membalas dengan jurus elemen ke {$playerName}! Menghasilkan {$dmgToPlayer} DMG. [Sisa HP: {$curPlayerHp}]";

                if ($curPlayerHp <= 0) {
                    $roundLog["actions"][] = "💥 [Slot " . ($ninjaIdx + 1) . "] {$playerName} gugur dalam pertempuran!";
                    $ninjaIdx++;
                    if ($ninjaIdx < $teamNinjas->count()) {
                        $activeNinja = $teamNinjas[$ninjaIdx];
                        $curPlayerHp = $activeNinja->hp;
                        $roundLog["actions"][] = "⚡ Shinobi Slot " . ($ninjaIdx + 1) . " ({$activeNinja->master->name}) melompat maju ke arena tempur!";
                    } else {
                        $playerWon = false;
                        $battleLogs[] = $roundLog;
                        break;
                    }
                }
            } else {
                // Boss turn first
                $dmgToPlayer = max(10, (int)(($bossAtk * 1.4) - ($playerDef * 0.45)) + mt_rand(-8, 12));
                $curPlayerHp = max(0, $curPlayerHp - $dmgToPlayer);
                $roundLog["actions"][] = "{$bossName} melancarkan serangan kejutan ke {$playerName}! Menghasilkan {$dmgToPlayer} DMG. [Sisa HP: {$curPlayerHp}]";

                if ($curPlayerHp <= 0) {
                    $roundLog["actions"][] = "💥 [Slot " . ($ninjaIdx + 1) . "] {$playerName} gugur dalam pertempuran!";
                    $ninjaIdx++;
                    if ($ninjaIdx < $teamNinjas->count()) {
                        $activeNinja = $teamNinjas[$ninjaIdx];
                        $curPlayerHp = $activeNinja->hp;
                        $roundLog["actions"][] = "⚡ Shinobi Slot " . ($ninjaIdx + 1) . " ({$activeNinja->master->name}) melompat maju ke arena tempur!";
                    } else {
                        $playerWon = false;
                        $battleLogs[] = $roundLog;
                        break;
                    }
                } else {
                    // Player turn
                    $dmgToBoss = max(15, (int)(($playerAtk * 1.5) - ($bossDef * 0.4)) + mt_rand(-10, 15));
                    $curBossHp = max(0, $curBossHp - $dmgToBoss);
                    $roundLog["actions"][] = "[Slot " . ($ninjaIdx + 1) . "] {$playerName} membalas dengan teknik Taijutsu! Menghasilkan {$dmgToBoss} DMG. [Sisa HP Boss: {$curBossHp}]";

                    if ($curBossHp <= 0) {
                        $playerWon = true;
                        $roundLog["actions"][] = "🏆 {$bossName} berhasil ditumbangkan oleh {$playerName}!";
                        $battleLogs[] = $roundLog;
                        break;
                    }
                }
            }

            $battleLogs[] = $roundLog;
            $round++;
        }

        // Deduct stamina
        $user->stamina = max(0, $user->stamina - 10);

        if ($playerWon) {
            $rewardSilver = $exam->reward_silver ?: (5000 * $floor);
            $rewardGold = $exam->reward_gold ?: (10 * $floor);
            $rewardExp = $exam->reward_exp ?: (200 * $floor);

            $user->silver += $rewardSilver;
            $user->gold += $rewardGold;
            $user->exp += $rewardExp;

            if ($floor >= $user->exam_floor) {
                $user->exam_floor = $floor + 1;
            }

            $user->save();

            return back()->with([
                'success' => "🎉 KEMENANGAN! Tim Shinobi Anda berhasil menaklukkan Lantai {$floor}! Mendapatkan +" . number_format($rewardSilver) . " Silver, +{$rewardGold} Gold, dan +{$rewardExp} EXP!",
                'battle_result' => [
                    'won' => true,
                    'floor' => $floor,
                    'boss' => $bossName,
                    'logs' => $battleLogs
                ]
            ]);
        } else {
            $user->save();
            return back()->with([
                'error' => "⚔️ Pertarungan sengit! Seluruh shinobi di formasi Anda gugur di Lantai {$floor}. Tingkatkan level shinobi atau kombinasikan ninja untuk memperkuat status!",
                'battle_result' => [
                    'won' => false,
                    'floor' => $floor,
                    'boss' => $bossName,
                    'logs' => $battleLogs
                ]
            ]);
        }
    }
}
