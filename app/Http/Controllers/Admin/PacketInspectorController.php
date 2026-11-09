<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ApkIncomingLog;

class PacketInspectorController extends Controller
{
    public function index()
    {
        $packets = ApkIncomingLog::orderBy('id', 'desc')->paginate(25);
        $totalPackets = ApkIncomingLog::count();

        return view('admin.inspector', compact('packets', 'totalPackets'));
    }

    public function clear()
    {
        ApkIncomingLog::truncate();
        return back()->with('success', 'Riwayat log packet APK berhasil dibersihkan.');
    }
}
