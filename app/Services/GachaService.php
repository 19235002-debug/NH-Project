<?php

namespace App\Services;

use App\Models\User;
use App\Models\MasterNinja;
use App\Models\PlayerNinja;
use App\Models\MasterJutsu;
use App\Models\MasterBeast;
use App\Models\PlayerJutsu;
use Illuminate\Support\Facades\DB;
use Exception;

class GachaService
{
    const BASIC_SILVER_COST = 30000;
    const ADVANCED_GOLD_COST = 298;
    const SPECIAL_10X_GOLD_COST = 2980;
    const CRANE_GOLD_COST = 298;
    const CRANE_10X_GOLD_COST = 2980;
    const UR_PITY_THRESHOLD = 50;

    /**
     * Get gacha metadata, rates, costs, roster, and player pity status
     */
    public function getInfo(User $user): array
    {
        $allGachaNinjas = MasterNinja::where('gacha_available', 1)
            ->orderBy('quality', 'desc')
            ->orderBy('name', 'asc')
            ->get();

        $rosterByGrade = [];
        foreach ($allGachaNinjas as $n) {
            $g = $n->grade;
            if (!isset($rosterByGrade[$g])) {
                $rosterByGrade[$g] = [];
            }
            $rosterByGrade[$g][] = [
                'id' => $n->id,
                'name' => $n->name,
                'grade' => $n->grade,
                'element' => $n->element ?? 'Neutral',
                'xmlfile' => $n->xmlfile ?? 'ninja',
                'quality' => (int)$n->quality,
                'base_atk' => (int)$n->base_atk,
                'base_def' => (int)$n->base_def,
                'base_hp' => (int)$n->base_hp,
                'base_speed' => (int)$n->base_speed,
                'description' => $n->description ?? ''
            ];
        }

        return [
            'pity' => [
                'current' => (int)$user->gacha_pity,
                'threshold' => self::UR_PITY_THRESHOLD,
                'crane_current' => (int)$user->crane_pity,
                'remaining' => max(0, self::UR_PITY_THRESHOLD - (int)$user->gacha_pity)
            ],
            'costs' => [
                'basic' => ['silver' => self::BASIC_SILVER_COST, 'gold' => 0, 'count' => 1],
                'advanced' => ['silver' => 0, 'gold' => self::ADVANCED_GOLD_COST, 'count' => 1],
                'special' => ['silver' => 0, 'gold' => self::SPECIAL_10X_GOLD_COST, 'count' => 10],
                'crane' => ['silver' => 0, 'gold' => self::CRANE_GOLD_COST, 'count' => 1],
                'crane_10x' => ['silver' => 0, 'gold' => self::CRANE_10X_GOLD_COST, 'count' => 10]
            ],
            'rates' => [
                'basic' => [
                    'D' => '55.0%',
                    'C' => '35.0%',
                    'B' => '8.5%',
                    'A' => '1.4%',
                    'S' => '0.1%'
                ],
                'advanced' => [
                    'B' => '55.0%',
                    'A' => '32.0%',
                    'S' => '9.0%',
                    'SS' => '3.0%',
                    'SSS' => '0.8%',
                    'UR' => '0.2%'
                ],
                'special_guarantee_slot' => [
                    'A' => '50.0%',
                    'S' => '30.0%',
                    'SS' => '14.0%',
                    'SSS' => '4.5%',
                    'UR' => '1.5%'
                ],
                'crane' => [
                    'S' => '88.4%',
                    'SS' => '9.0%',
                    'SSS' => '2.0%',
                    'UR' => '0.6%'
                ]
            ],
            'roster' => $rosterByGrade,
            'user_currency' => [
                'silver' => (int)$user->silver,
                'gold' => (int)$user->gold
            ]
        ];
    }

    /**
     * Perform recruitment pull
     */
    public function pull(User $user, string $hutType): array
    {
        $hutKey = strtolower(trim($hutType));
        if ($hutKey === 'advanced_10x') $hutKey = 'special';

        $costSilver = 0;
        $costGold = 0;
        $pullCount = 1;
        $isCrane = false;

        switch ($hutKey) {
            case 'basic':
                $costSilver = self::BASIC_SILVER_COST;
                $pullCount = 1;
                if ($user->silver < $costSilver) {
                    throw new Exception("Silver tidak mencukupi. Diperlukan " . number_format($costSilver) . " Silver.");
                }
                break;

            case 'advanced':
                $costGold = self::ADVANCED_GOLD_COST;
                $pullCount = 1;
                if ($user->gold < $costGold) {
                    throw new Exception("Gold tidak mencukupi. Diperlukan " . number_format($costGold) . " Gold.");
                }
                break;

            case 'special':
                $costGold = self::SPECIAL_10X_GOLD_COST;
                $pullCount = 10;
                if ($user->gold < $costGold) {
                    throw new Exception("Gold tidak mencukupi. Diperlukan " . number_format($costGold) . " Gold untuk 10x Capture.");
                }
                break;

            case 'crane':
                $costGold = self::CRANE_GOLD_COST;
                $pullCount = 1;
                $isCrane = true;
                if ($user->gold < $costGold) {
                    throw new Exception("Gold tidak mencukupi. Diperlukan " . number_format($costGold) . " Gold.");
                }
                break;

            case 'crane_10x':
                $costGold = self::CRANE_10X_GOLD_COST;
                $pullCount = 10;
                $isCrane = true;
                if ($user->gold < $costGold) {
                    throw new Exception("Gold tidak mencukupi. Diperlukan " . number_format($costGold) . " Gold untuk 10x Claw Crane.");
                }
                break;

            default:
                throw new Exception("Tipe rekrutmen tidak valid.");
        }

        $currentPity = (int)$user->gacha_pity;
        $currentCranePity = (int)$user->crane_pity;
        $pityTriggered = false;
        $recruitedList = [];

        $hasAnyNinja = $user->playerNinjas()->exists();

        for ($i = 0; $i < $pullCount; $i++) {
            $isGuaranteedSlot = ($hutKey === 'special' && $i === ($pullCount - 1));
            $targetGrade = 'D';

            if ($isCrane) {
                $currentCranePity++;
                if ($currentCranePity >= self::UR_PITY_THRESHOLD) {
                    $targetGrade = 'UR';
                    $currentCranePity = 0;
                    $pityTriggered = true;
                } else {
                    $targetGrade = $this->rollCraneGrade();
                    if ($targetGrade === 'UR') $currentCranePity = 0;
                }
            } else {
                if ($hutKey === 'basic') {
                    $targetGrade = $this->rollBasicGrade();
                } else {
                    $currentPity++;
                    if ($currentPity >= self::UR_PITY_THRESHOLD) {
                        $targetGrade = 'UR';
                        $currentPity = 0;
                        $pityTriggered = true;
                    } elseif ($isGuaranteedSlot) {
                        $targetGrade = $this->rollGuaranteedGrade();
                        if ($targetGrade === 'UR') $currentPity = 0;
                    } else {
                        $targetGrade = $this->rollAdvancedGrade();
                        if ($targetGrade === 'UR') $currentPity = 0;
                    }
                }
            }

            // Fetch ninja of target grade
            $ninjaRow = MasterNinja::where('grade', $targetGrade)
                ->where('gacha_available', 1)
                ->inRandomOrder()
                ->first();

            if (!$ninjaRow) {
                $ninjaRow = MasterNinja::where('gacha_available', 1)->inRandomOrder()->first();
            }

            $recruitedList[] = [
                'target_grade' => $targetGrade,
                'data' => $ninjaRow,
                'is_guaranteed' => $isGuaranteedSlot,
                'is_pity' => ($targetGrade === 'UR' && $pityTriggered)
            ];
        }

        // Database transaction
        $formattedNinjas = [];
        DB::transaction(function () use (
            $user, $costSilver, $costGold, $isCrane, $currentCranePity, $currentPity,
            $recruitedList, $hasAnyNinja, &$formattedNinjas
        ) {
            // Deduct user currency
            $user->silver -= $costSilver;
            $user->gold -= $costGold;
            if ($isCrane) {
                $user->crane_pity = $currentCranePity;
            } else {
                $user->gacha_pity = $currentPity;
            }
            $user->save();

            // Insert into player_ninjas
            foreach ($recruitedList as $idx => $item) {
                $recruited = $item['data'];
                $isMain = (!$hasAnyNinja && $idx === 0) ? 1 : 0;

                $pn = PlayerNinja::create([
                    'user_id' => $user->id,
                    'ninja_id' => $recruited->id,
                    'level' => 1,
                    'exp' => 0,
                    'is_main' => $isMain,
                    'jutsu_slot_1' => $recruited->special_jutsu_id ?? 1149,
                    'jutsu_slot_2' => 0,
                    'jutsu_slot_3' => 0
                ]);

                $formattedNinjas[] = [
                    'player_ninja_id' => $pn->id,
                    'ninja_id' => $recruited->id,
                    'name' => $recruited->name,
                    'title' => $recruited->grade . '-Rank Shinobi',
                    'xmlfile' => $recruited->xmlfile ?? 'ninja',
                    'quality' => (int)$recruited->quality,
                    'grade' => $recruited->grade,
                    'chakra_type' => (int)$recruited->chakra_type,
                    'element' => $recruited->element ?? 'None',
                    'base_hp' => (int)$recruited->base_hp,
                    'base_atk' => (int)$recruited->base_atk,
                    'base_def' => (int)$recruited->base_def,
                    'base_speed' => (int)$recruited->base_speed,
                    'special_jutsu_id' => (int)$recruited->special_jutsu_id,
                    'description' => $recruited->description ?? '',
                    'is_guaranteed' => $item['is_guaranteed'],
                    'is_pity' => $item['is_pity']
                ];
            }
        });

        return [
            'hut_type' => $hutKey,
            'count' => $pullCount,
            'recruited_ninjas' => $formattedNinjas,
            'recruited_ninja' => $formattedNinjas[0],
            'pity' => [
                'current' => $isCrane ? $currentCranePity : $currentPity,
                'threshold' => self::UR_PITY_THRESHOLD,
                'remaining' => max(0, self::UR_PITY_THRESHOLD - ($isCrane ? $currentCranePity : $currentPity)),
                'triggered' => $pityTriggered
            ],
            'cost_deducted' => [
                'silver' => $costSilver,
                'gold' => $costGold
            ],
            'user_currency' => [
                'silver' => (int)$user->silver,
                'gold' => (int)$user->gold
            ]
        ];
    }

    private function rollBasicGrade(): string
    {
        $rand = mt_rand(1, 1000);
        if ($rand <= 550) return 'D';
        if ($rand <= 900) return 'C';
        if ($rand <= 985) return 'B';
        if ($rand <= 999) return 'A';
        return 'S';
    }

    private function rollAdvancedGrade(): string
    {
        $rand = mt_rand(1, 1000);
        if ($rand <= 550) return 'B';
        if ($rand <= 870) return 'A';
        if ($rand <= 960) return 'S';
        if ($rand <= 990) return 'SS';
        if ($rand <= 998) return 'SSS';
        return 'UR';
    }

    private function rollGuaranteedGrade(): string
    {
        $rand = mt_rand(1, 1000);
        if ($rand <= 500) return 'A';
        if ($rand <= 800) return 'S';
        if ($rand <= 940) return 'SS';
        if ($rand <= 985) return 'SSS';
        return 'UR';
    }

    private function rollCraneGrade(): string
    {
        $rand = mt_rand(1, 10000);
        if ($rand <= 8840) return 'S';
        if ($rand <= 9740) return 'SS';
        if ($rand <= 9940) return 'SSS';
        return 'UR';
    }

    const JUTSU_SILVER_COST = 30000;
    const JUTSU_GOLD_COST = 50;
    const SUMMON_GOLD_COST = 98;
    const BIJU_GOLD_COST = 298;

    public function pullJutsu(User $user, string $type): array
    {
        $costSilver = 0;
        $costGold = 0;
        $pool = collect();

        // 1. Determine cost and candidate pool
        if ($type === 'ninjutsu_silver') {
            $costSilver = self::JUTSU_SILVER_COST;
            if ($user->silver < $costSilver) {
                throw new Exception("Silver tidak cukup. Diperlukan 30,000 Silver.");
            }
            $grade = $this->rollBasicGrade(); // D, C, B, A, S
            $pool = MasterJutsu::where('grade', $grade)
                ->whereIn('category', ['Ninjutsu', 'Taijutsu', 'Genjutsu'])
                ->get();
        } elseif ($type === 'ninjutsu_gold') {
            $costGold = self::JUTSU_GOLD_COST;
            if ($user->gold < $costGold) {
                throw new Exception("Gold tidak cukup. Diperlukan 50 Gold.");
            }
            $grade = $this->rollAdvancedGrade(); // B, A, S, SS, SSS, UR
            $pool = MasterJutsu::where('grade', $grade)->get();
        } elseif ($type === 'summon') {
            $costGold = self::SUMMON_GOLD_COST;
            if ($user->gold < $costGold) {
                throw new Exception("Gold tidak cukup. Diperlukan 98 Gold.");
            }
            $pool = MasterJutsu::where(function($q) {
                $q->where('name', 'like', '%summon%')
                  ->orWhere('name', 'like', '%toad%')
                  ->orWhere('name', 'like', '%slug%')
                  ->orWhere('name', 'like', '%snake%')
                  ->orWhere('name', 'like', '%bunta%')
                  ->orWhere('name', 'like', '%manda%')
                  ->orWhere('name', 'like', '%katsuyu%')
                  ->orWhere('name', 'like', '%gama%')
                  ->orWhere('description', 'like', '%summon%');
            })->get();
        } elseif ($type === 'biju') {
            $costGold = self::BIJU_GOLD_COST;
            if ($user->gold < $costGold) {
                throw new Exception("Gold tidak cukup. Diperlukan 298 Gold.");
            }
            $beasts = MasterBeast::all();
            $skillIds = [];
            foreach ($beasts as $b) {
                $skillIds = array_merge($skillIds, $b->skill_ids);
            }
            $pool = MasterJutsu::whereIn('id', array_unique($skillIds))->get();
        } else {
            throw new Exception("Tipe Gacha Jutsu tidak valid.");
        }

        if ($pool->isEmpty()) {
            $pool = MasterJutsu::inRandomOrder()->take(5)->get();
        }

        $drawnJutsu = $pool->random();

        // Transaction: deduct currency and add jutsu to player_jutsus
        DB::transaction(function () use ($user, $costSilver, $costGold, $drawnJutsu) {
            $user->silver -= $costSilver;
            $user->gold -= $costGold;
            $user->save();

            $pj = PlayerJutsu::where('user_id', $user->id)
                ->where('jutsu_id', $drawnJutsu->id)
                ->first();
            if ($pj) {
                $pj->quantity += 1;
                $pj->save();
            } else {
                PlayerJutsu::create([
                    'user_id' => $user->id,
                    'jutsu_id' => $drawnJutsu->id,
                    'quantity' => 1
                ]);
            }
        });

        return [
            'jutsu' => [
                'id' => $drawnJutsu->id,
                'name' => $drawnJutsu->name,
                'category' => $drawnJutsu->category,
                'grade' => $drawnJutsu->grade,
                'icon' => $drawnJutsu->icon ?? 'skill_001',
                'description' => $drawnJutsu->description,
                'damage' => $drawnJutsu->desc_dmg,
                'turn' => $drawnJutsu->desc_turn
            ],
            'cost_deducted' => [
                'silver' => $costSilver,
                'gold' => $costGold
            ],
            'user_currency' => [
                'silver' => (int)$user->silver,
                'gold' => (int)$user->gold
            ]
        ];
    }
}
