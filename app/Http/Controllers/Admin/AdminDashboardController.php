<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\PlayerNinja;
use App\Models\ApkIncomingLog;
use App\Models\ServerNotice;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function index()
    {
        $admin = Auth::user();

        $stats = [
            'total_users' => User::count(),
            'total_banned' => User::where('is_banned', 1)->count(),
            'total_silver' => User::sum('silver'),
            'total_gold' => User::sum('gold'),
            'total_ninjas_owned' => PlayerNinja::count(),
            'total_packet_logs' => ApkIncomingLog::count(),
        ];

        $recentUsers = User::latest('id')->take(6)->get();
        $recentPackets = ApkIncomingLog::latest('id')->take(10)->get();
        $notices = ServerNotice::latest('id')->take(5)->get();

        // Check if game_server.py websocket is running on port 1763 or 1764
        $socketRunning = false;
        $connection = @fsockopen('127.0.0.1', 1763, $errno, $errstr, 0.3);
        if (is_resource($connection)) {
            $socketRunning = true;
            fclose($connection);
        }

        return view('admin.dashboard', compact('admin', 'stats', 'recentUsers', 'recentPackets', 'notices', 'socketRunning'));
    }
}
