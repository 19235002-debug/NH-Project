<?php

namespace App\Http\Controllers\Player;

use App\Http\Controllers\Controller;
use App\Models\ServerNotice;
use App\Models\NoticeClaim;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PlayerDashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $user->load(['mainNinja.master', 'mainNinja.jutsu1', 'playerNinjas.master']);

        $notice = ServerNotice::where('is_active', 1)->latest('id')->first();
        $hasClaimedNotice = false;

        if ($notice && $notice->reward_gold > 0) {
            $hasClaimedNotice = NoticeClaim::where('notice_id', $notice->id)
                ->where('user_id', $user->id)
                ->exists();
        }

        $totalNinjas = $user->playerNinjas->count();
        $highestGradeNinja = $user->playerNinjas
            ->sortByDesc(fn($pn) => $pn->master->quality ?? 0)
            ->first();

        $deployedNinjas = $user->deployedNinjas()->with(['master.specialJutsu', 'jutsu1'])->get();

        return view('player.dashboard', compact(
            'user', 
            'notice', 
            'hasClaimedNotice', 
            'totalNinjas', 
            'highestGradeNinja',
            'deployedNinjas'
        ));
    }

    public function claimNoticeGold(Request $request, int $id)
    {
        $user = Auth::user();
        $notice = ServerNotice::where('is_active', 1)->findOrFail($id);

        if ($notice->reward_gold <= 0) {
            return back()->with('error', 'Pengumuman ini tidak memiliki hadiah Gold.');
        }

        $alreadyClaimed = NoticeClaim::where('notice_id', $notice->id)
            ->where('user_id', $user->id)
            ->exists();

        if ($alreadyClaimed) {
            return back()->with('error', 'Anda sudah mengambil hadiah dari pengumuman ini.');
        }

        DB::transaction(function () use ($user, $notice) {
            $user->increment('gold', $notice->reward_gold);
            NoticeClaim::create([
                'notice_id' => $notice->id,
                'user_id' => $user->id,
                'claimed_gold' => $notice->reward_gold,
                'created_at' => now(),
            ]);
        });

        return back()->with('success', "🎁 Selamat! Anda berhasil mengklaim +" . number_format($notice->reward_gold) . " Gold dari pengumuman server!");
    }

    public function claimRamen()
    {
        $user = Auth::user();
        $now = time();
        $cooldown = 4 * 3600; // 4 hours

        if (($now - $user->last_ramen_claim) < $cooldown) {
            $remainingMins = ceil(($cooldown - ($now - $user->last_ramen_claim)) / 60);
            return back()->with('error', "Ramen Ichiraku sedang disiapkan koki Teuchi! Tunggu {$remainingMins} menit lagi.");
        }

        $user->stamina = min(150, $user->stamina + 50);
        $user->last_ramen_claim = $now;
        $user->save();

        return back()->with('success', '🍜 Enak sekali! Anda menyantap semangkuk Ramen Ichiraku Spesial (+50 Stamina)!');
    }
}
