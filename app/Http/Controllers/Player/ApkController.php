<?php

namespace App\Http\Controllers\Player;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;

class ApkController extends Controller
{
    protected function getApkFile(): ?string
    {
        $candidates = [
            base_path('OkkaNHNE-Private.apk'),
            public_path('OkkaNHNE-Private.apk'),
            public_path('download/OkkaNHNE-Private.apk'),
            public_path('Ninja_Heroes_Private_Server.apk')
        ];

        foreach ($candidates as $file) {
            if (file_exists($file) && is_file($file)) {
                return $file;
            }
        }

        return null;
    }

    public function index()
    {
        $user = Auth::user();
        $apkFileName = 'OkkaNHNE-Private.apk';
        $apkPath = $this->getApkFile();
        $apkExists = $apkPath !== null;
        $apkSizeMb = $apkExists ? round(filesize($apkPath) / (1024 * 1024), 1) : 0;

        return view('player.apk', compact('user', 'apkFileName', 'apkExists', 'apkSizeMb'));
    }

    public function download()
    {
        $apkPath = $this->getApkFile();
        if ($apkPath && file_exists($apkPath)) {
            return response()->download($apkPath, 'OkkaNHNE-Private.apk', [
                'Content-Type' => 'application/vnd.android.package-archive'
            ]);
        }
        return back()->with('error', 'File APK belum tersedia di server.');
    }
}
