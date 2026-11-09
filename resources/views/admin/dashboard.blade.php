@extends('layouts.admin')

@section('title', 'Game Master Dashboard - Ninja Heroes')

@section('content')
<div class="space-y-6">

    <!-- Top Server Status Banner -->
    <div class="glass-panel p-6 border-l-4 border-l-amber-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <div class="flex items-center gap-2 mb-1">
                <span class="w-2.5 h-2.5 rounded-full {{ $socketRunning ? 'bg-emerald-400 animate-pulse' : 'bg-red-500' }}"></span>
                <span class="font-title font-bold text-base text-white">STATUS CORE SERVER GAME</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-black font-mono {{ $socketRunning ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40' }}">
                    {{ $socketRunning ? 'ONLINE' : 'OFFLINE / STANDBY' }}
                </span>
            </div>
            <p class="text-xs text-slate-400">
                WebSocket Server: <code class="text-amber-400">game_server.py</code> (Port 1763 / 8080) • Apache HTTP Adapter: <code class="text-ninja-cyan">Active (Laravel)</code>
            </p>
        </div>

        <div class="flex items-center gap-2">
            <a href="{{ route('admin.inspector') }}" class="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 transition-all flex items-center gap-1.5">
                <i class="fa-solid fa-network-wired text-ninja-cyan"></i> Buka Inspector
            </a>
            <a href="{{ route('admin.players') }}" class="btn-ninja-gold text-xs py-2">
                <i class="fa-solid fa-users-gear"></i> Kelola Pemain
            </a>
        </div>
    </div>

    <!-- Metrics Grid -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <!-- Metric 1: Total Users -->
        <div class="glass-panel p-4">
            <div class="text-[11px] text-slate-400 font-semibold mb-1">Total Pemain</div>
            <div class="text-2xl font-black text-white font-mono">{{ number_format($stats['total_users']) }}</div>
            <div class="text-[10px] text-emerald-400 mt-1"><i class="fa-solid fa-user-check"></i> Terdaftar di MySQL</div>
        </div>

        <!-- Metric 2: Banned Users -->
        <div class="glass-panel p-4">
            <div class="text-[11px] text-slate-400 font-semibold mb-1">Akun Banned</div>
            <div class="text-2xl font-black {{ $stats['total_banned'] > 0 ? 'text-red-400' : 'text-slate-400' }} font-mono">
                {{ number_format($stats['total_banned']) }}
            </div>
            <div class="text-[10px] text-slate-500 mt-1">Ditangguhkan</div>
        </div>

        <!-- Metric 3: Total Silver -->
        <div class="glass-panel p-4">
            <div class="text-[11px] text-slate-400 font-semibold mb-1">Sirkulasi Silver</div>
            <div class="text-xl font-black text-slate-200 font-mono truncate" title="{{ number_format($stats['total_silver']) }}">
                {{ number_format($stats['total_silver'] / 1000000, 1) }}M
            </div>
            <div class="text-[10px] text-slate-500 mt-1">Silver Aktif</div>
        </div>

        <!-- Metric 4: Total Gold -->
        <div class="glass-panel p-4">
            <div class="text-[11px] text-slate-400 font-semibold mb-1">Sirkulasi Gold</div>
            <div class="text-xl font-black text-amber-400 font-mono truncate" title="{{ number_format($stats['total_gold']) }}">
                {{ number_format($stats['total_gold']) }}
            </div>
            <div class="text-[10px] text-amber-400/80 mt-1"><i class="fa-solid fa-gem"></i> Gold Pemain</div>
        </div>

        <!-- Metric 5: Total Owned Ninjas -->
        <div class="glass-panel p-4">
            <div class="text-[11px] text-slate-400 font-semibold mb-1">Shinobi Direkrut</div>
            <div class="text-2xl font-black text-ninja-orange font-mono">{{ number_format($stats['total_ninjas_owned']) }}</div>
            <div class="text-[10px] text-slate-500 mt-1">Di Inventory</div>
        </div>

        <!-- Metric 6: Total Packet Logs -->
        <div class="glass-panel p-4">
            <div class="text-[11px] text-slate-400 font-semibold mb-1">Paket Masuk (APK)</div>
            <div class="text-2xl font-black text-ninja-cyan font-mono">{{ number_format($stats['total_packet_logs']) }}</div>
            <div class="text-[10px] text-ninja-cyan/80 mt-1">Terekam Log</div>
        </div>
    </div>

    <!-- Two Columns: Recent Players & Recent APK Packets -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Col 1: Recent Players -->
        <div class="glass-panel p-5 flex flex-col justify-between">
            <div>
                <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                    <h3 class="font-title font-bold text-sm text-white flex items-center gap-2">
                        <i class="fa-solid fa-user-plus text-amber-400"></i> PEMAIN TERDAFTAR TERBARU
                    </h3>
                    <a href="{{ route('admin.players') }}" class="text-xs text-amber-400 hover:underline">Lihat Semua →</a>
                </div>

                <div class="space-y-2.5">
                    @forelse($recentUsers as $u)
                        <div class="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold font-mono">
                                    {{ substr($u->username, 0, 1) }}
                                </div>
                                <div>
                                    <div class="font-bold text-white flex items-center gap-2">
                                        {{ $u->username }}
                                        @if($u->isAdmin())
                                            <span class="px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">GM</span>
                                        @endif
                                    </div>
                                    <div class="text-[10px] text-slate-400 font-mono">Lv. {{ $u->level }} • VIP {{ $u->vip_level }}</div>
                                </div>
                            </div>
                            <div class="text-right font-mono text-[11px]">
                                <div class="text-amber-400">{{ number_format($u->gold) }} G</div>
                                <div class="text-slate-400">{{ number_format($u->silver) }} S</div>
                            </div>
                        </div>
                    @empty
                        <div class="text-center py-6 text-slate-500 text-xs">Belum ada pemain.</div>
                    @endforelse
                </div>
            </div>
        </div>

        <!-- Col 2: Recent APK Packets -->
        <div class="glass-panel p-5 flex flex-col justify-between">
            <div>
                <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                    <h3 class="font-title font-bold text-sm text-white flex items-center gap-2">
                        <i class="fa-solid fa-network-wired text-ninja-cyan"></i> TRAFFIC CLIENT MOBILE (APK) TERAKHIR
                    </h3>
                    <a href="{{ route('admin.inspector') }}" class="text-xs text-ninja-cyan hover:underline">Inspector →</a>
                </div>

                <div class="space-y-2">
                    @forelse($recentPackets as $p)
                        <div class="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs font-mono">
                            <div class="flex items-center gap-2 overflow-hidden">
                                <span class="px-1.5 py-0.5 rounded text-[9px] font-black {{ $p->method === 'POST' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400' }}">
                                    {{ $p->method }}
                                </span>
                                <span class="text-slate-300 truncate text-[11px]">/{{ $p->endpoint }}</span>
                            </div>
                            <div class="text-[10px] text-slate-500 whitespace-nowrap pl-2">
                                {{ date('H:i:s', strtotime($p->created_at)) }}
                            </div>
                        </div>
                    @empty
                        <div class="text-center py-6 text-slate-500 text-xs font-sans">Belum ada paket mobile terekam.</div>
                    @endforelse
                </div>
            </div>
        </div>
    </div>

</div>
@endsection
