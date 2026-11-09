@extends('layouts.player')

@section('title', 'Download Client Game APK - Ninja Heroes')

@section('content')
<div class="space-y-6 max-w-4xl mx-auto">

    <!-- Header -->
    <div class="text-center">
        <h1 class="font-title font-black text-3xl sm:text-4xl text-white tracking-wide">
            📱 DOWNLOAD GAME APK
        </h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-2">
            Unduh Client APK Ninja Heroes Private Server untuk Android & Emulator PC (LDPlayer, MuMu, Bluestacks).
        </p>
    </div>

    <!-- Download Card -->
    <div class="glass-panel p-6 sm:p-8 border-2 border-ninja-cyan/40 shadow-glow-cyan/15 flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="flex items-center gap-5 text-center sm:text-left">
            <div class="w-20 h-20 rounded-2xl bg-ninja-cyan/20 border-2 border-ninja-cyan text-ninja-cyan flex items-center justify-center text-4xl shadow-glow-cyan flex-shrink-0">
                <i class="fa-solid fa-mobile-screen-button"></i>
            </div>
            <div>
                <div class="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold mb-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> VERSI OTENTIK PRIVATE SERVER
                </div>
                <h3 class="font-title font-black text-xl text-white">{{ $apkFileName }}</h3>
                <p class="text-xs text-slate-400 mt-1">Ukuran File: <strong class="text-white font-mono">{{ $apkSizeMb }} MB</strong> • Format: Android Package (.apk)</p>
            </div>
        </div>

        <div class="flex-shrink-0 w-full sm:w-auto">
            @if($apkExists)
                <a href="{{ route('player.apk.download') }}" class="btn-ninja-cyan w-full sm:w-auto py-3 px-8 text-sm font-black shadow-glow-cyan">
                    <i class="fa-solid fa-download"></i> Unduh File APK Sekarang
                </a>
            @else
                <button disabled class="btn-ninja-secondary opacity-50 cursor-not-allowed w-full">
                    File APK Belum Diupload
                </button>
            @endif
        </div>
    </div>

    <!-- Instructions Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Card 1: Cara Instalasi -->
        <div class="glass-panel p-6 space-y-3">
            <h3 class="font-title font-bold text-base text-white flex items-center gap-2">
                <i class="fa-solid fa-circle-question text-ninja-orange"></i> PANDUAN INSTALASI
            </h3>
            <ul class="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                <li>Download file APK di atas ke perangkat Android atau PC Anda.</li>
                <li>Jika menggunakan Emulator (LDPlayer / MuMu / Bluestacks), cukup <em>drag-and-drop</em> file APK ke dalam jendela emulator.</li>
                <li>Jika menginstal di HP Android, aktifkan <strong>"Izinkan instalasi dari sumber tidak dikenal"</strong> di pengaturan keamanan.</li>
                <li>Buka aplikasi <strong>Ninja Heroes</strong> dan masuk dengan akun Anda.</li>
            </ul>
        </div>

        <!-- Card 2: Konfigurasi Koneksi Server -->
        <div class="glass-panel p-6 space-y-3">
            <h3 class="font-title font-bold text-base text-white flex items-center gap-2">
                <i class="fa-solid fa-server text-ninja-cyan"></i> INFORMASI SERVER LOKAL
            </h3>
            <div class="space-y-2 text-xs font-mono">
                <div class="p-2.5 rounded-xl bg-black/40 border border-white/5 flex justify-between">
                    <span class="text-slate-500 font-sans">HTTP API Port:</span>
                    <span class="text-white font-bold">80 / 443 (Laragon Apache)</span>
                </div>
                <div class="p-2.5 rounded-xl bg-black/40 border border-white/5 flex justify-between">
                    <span class="text-slate-500 font-sans">WebSocket Port:</span>
                    <span class="text-ninja-cyan font-bold">1763 / 8080 (game_server.py)</span>
                </div>
                <div class="p-2.5 rounded-xl bg-black/40 border border-white/5 flex justify-between">
                    <span class="text-slate-500 font-sans">Database MySQL:</span>
                    <span class="text-amber-400 font-bold">127.0.0.1:3306 [ninja_heroes]</span>
                </div>
            </div>
        </div>
    </div>

</div>
@endsection
