<?php

namespace App\Http\Controllers\Player;

use App\Http\Controllers\Controller;
use App\Models\PlayerNinja;
use App\Models\MasterNinja;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CombineController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $candidates = PlayerNinja::with('master')
            ->where('user_id', $user->id)
            ->where('is_main', 0) // Cannot sacrifice main ninja
            ->whereHas('master', fn($q) => $q->where('grade', '!=', 'UR')) // UR cannot be evolved further
            ->get();

        return view('player.combine', compact('user', 'candidates'));
    }

    public function execute(Request $request)
    {
        $request->validate([
            'ninja_ids' => 'required|array|min:3|max:5',
            'ninja_ids.*' => 'integer'
        ]);

        $user = Auth::user();
        $ids = $request->ninja_ids;

        $fodders = PlayerNinja::with('master')
            ->where('user_id', $user->id)
            ->whereIn('id', $ids)
            ->where('is_main', 0)
            ->get();

        if ($fodders->count() !== count($ids)) {
            return back()->with('error', 'Beberapa ninja yang dipilih tidak valid atau sedang aktif sebagai Main Ninja.');
        }

        // Verify all have identical Grade
        $grades = $fodders->pluck('master.grade')->unique();
        if ($grades->count() > 1) {
            return back()->with('error', 'Semua shinobi yang dikorbankan untuk combine harus memiliki Grade yang sama!');
        }

        $currentGrade = $grades->first();
        $nextGradeMap = [
            'D' => 'C',
            'C' => 'B',
            'B' => 'A',
            'A' => 'S',
            'S' => 'SS',
            'SS' => 'SSS',
            'SSS' => 'UR'
        ];

        if (!isset($nextGradeMap[$currentGrade])) {
            return back()->with('error', 'Grade ini sudah mencapai tingkat tertinggi dan tidak dapat di-combine.');
        }

        $targetGrade = $nextGradeMap[$currentGrade];
        $count = count($ids);

        // Success probability: 3 = 60%, 4 = 80%, 5 = 100%
        $rates = [3 => 60, 4 => 80, 5 => 100];
        $chance = $rates[$count] ?? 100;
        $isSuccess = (mt_rand(1, 100) <= $chance);

        DB::beginTransaction();
        try {
            // Delete fodder ninjas
            PlayerNinja::whereIn('id', $ids)->delete();

            if ($isSuccess) {
                $rewardMaster = MasterNinja::where('grade', $targetGrade)
                    ->where('gacha_available', 1)
                    ->inRandomOrder()
                    ->first() ?? MasterNinja::where('grade', $targetGrade)->inRandomOrder()->first();

                $newNinja = PlayerNinja::create([
                    'user_id' => $user->id,
                    'ninja_id' => $rewardMaster->id,
                    'level' => 1,
                    'exp' => 0,
                    'is_main' => 0,
                    'jutsu_slot_1' => $rewardMaster->special_jutsu_id ?? 1149,
                    'jutsu_slot_2' => 0,
                    'jutsu_slot_3' => 0
                ]);

                DB::commit();
                return back()->with('success', "✨ COMBINE SUKSES! Anda berhasil mensintesis Shinobi Grade {$targetGrade}: {$rewardMaster->name}!");
            } else {
                // Consolation silver
                $consolationSilver = 20000 * $count;
                $user->silver += $consolationSilver;
                $user->save();

                DB::commit();
                return back()->with('error', "💥 Sintesis gagal ({$chance}% peluang). Shinobi bahan terurai menjadi " . number_format($consolationSilver) . " Silver chakra.");
            }
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Gagal memproses combine: ' . $e->getMessage());
        }
    }
}
