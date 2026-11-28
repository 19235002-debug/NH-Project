<?php

namespace App\Http\Controllers\Player;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;

class ApkController extends Controller
{
    protected function getApkFile(): ?string
    {
        $part0 = public_path('download/OkkaNHNE-Private.apk.part00');
        $merged = public_path('download/OkkaNHNE-Private.apk');
        if (file_exists($part0) && (!file_exists($merged) || filemtime($part0) > filemtime($merged))) {
            $parts = glob(public_path('download/OkkaNHNE-Private.apk.part*'));
            if (!empty($parts)) {
                sort($parts);
                $out = @fopen($merged, 'wb');
                if ($out) {
                    foreach ($parts as $p) {
                        $in = @fopen($p, 'rb');
                        if ($in) {
                            stream_copy_to_stream($in, $out);
                            fclose($in);
                        }
                    }
                    fclose($out);
                }
            }
        }

        $candidates = [
            public_path('download/OkkaNHNE-Private.apk'),
            base_path('OkkaNHNE-Private.apk'),
            public_path('OkkaNHNE-Private.apk'),
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
