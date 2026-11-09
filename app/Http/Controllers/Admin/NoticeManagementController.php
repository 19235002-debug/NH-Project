<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ServerNotice;
use App\Models\NoticeClaim;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NoticeManagementController extends Controller
{
    public function index()
    {
        $notices = ServerNotice::withCount('claims')
            ->orderBy('id', 'desc')
            ->paginate(10);

        return view('admin.notices', compact('notices'));
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:100',
            'content' => 'required|string|max:1000',
            'reward_gold' => 'nullable|integer|min:0|max:1000000',
            'is_active' => 'nullable|boolean',
            'distribute_all' => 'nullable|boolean'
        ]);

        $rewardGold = max(0, (int) $request->input('reward_gold', 0));
        $isActive = $request->boolean('is_active', true);
        $distributeAll = $request->boolean('distribute_all', false);

        // If activating this notice, we can optionally deactivate others or keep multiple active
        $notice = ServerNotice::create([
            'title' => $request->input('title'),
            'content' => $request->input('content'),
            'reward_gold' => $rewardGold,
            'is_active' => $isActive,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $msg = 'Pengumuman server berhasil disiarkan!';

        // Direct airdrop to all active players if checked
        if ($distributeAll && $rewardGold > 0) {
            $eligibleUsers = User::where('is_banned', 0)->get(['id']);
            $affected = 0;

            DB::transaction(function () use ($eligibleUsers, $notice, $rewardGold, &$affected) {
                foreach ($eligibleUsers as $u) {
                    User::where('id', $u->id)->increment('gold', $rewardGold);
                    NoticeClaim::firstOrCreate(
                        ['notice_id' => $notice->id, 'user_id' => $u->id],
                        ['claimed_gold' => $rewardGold, 'created_at' => now()]
                    );
                    $affected++;
                }
            });

            $msg .= " Hadiah +{$rewardGold} Gold langsung dibagikan ke {$affected} akun pemain!";
        }

        return back()->with('success', $msg);
    }

    public function airdrop(int $id)
    {
        $notice = ServerNotice::findOrFail($id);

        if ($notice->reward_gold <= 0) {
            return back()->with('error', 'Pengumuman ini tidak memiliki nominal hadiah Gold.');
        }

        $eligibleUsers = User::where('is_banned', 0)->get(['id']);
        $count = 0;

        DB::transaction(function () use ($eligibleUsers, $notice, &$count) {
            foreach ($eligibleUsers as $u) {
                // Check if user already claimed this notice
                $exists = NoticeClaim::where('notice_id', $notice->id)->where('user_id', $u->id)->exists();
                if (!$exists) {
                    User::where('id', $u->id)->increment('gold', $notice->reward_gold);
                    NoticeClaim::create([
                        'notice_id' => $notice->id,
                        'user_id' => $u->id,
                        'claimed_gold' => $notice->reward_gold,
                        'created_at' => now(),
                    ]);
                    $count++;
                }
            }
        });

        return back()->with('success', "🎁 Berhasil membagikan +{$notice->reward_gold} Gold ke {$count} pemain yang belum pernah klaim!");
    }

    public function toggle(int $id)
    {
        $notice = ServerNotice::findOrFail($id);
        $notice->is_active = !$notice->is_active;
        $notice->save();

        return back()->with('success', 'Status pengumuman berhasil diperbarui.');
    }

    public function destroy(int $id)
    {
        $notice = ServerNotice::findOrFail($id);
        // Delete related claims first
        NoticeClaim::where('notice_id', $notice->id)->delete();
        $notice->delete();

        return back()->with('success', 'Pengumuman dan riwayat klaimnya berhasil dihapus.');
    }
}
