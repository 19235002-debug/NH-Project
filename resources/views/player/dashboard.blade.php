@extends('layouts.player')

@section('title', 'Dashboard Shinobi - Ninja Heroes')

@section('content')
<div class="space-y-6">

    <!-- Announcement Banner (Hanya muncul jika belum diklaim atau pengumuman info) -->
    @if($notice && !($notice->reward_gold > 0 && $hasClaimedNotice))
        <div id="playerNoticeBanner" class="glass-panel p-4 sm:p-5 border {{ $notice->reward_gold > 0 ? 'border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-black/40 to-black/60 shadow-glow-gold/10' : 'border-l-4 border-l-ninja-orange' }} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-300">
            <div class="flex items-start gap-3.5 flex-1">
                <span class="w-10 h-10 rounded-xl {{ $notice->reward_gold > 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-glow-gold/20' : 'bg-ninja-orange/20 text-ninja-orange border border-ninja-orange/30' }} flex items-center justify-center text-lg flex-shrink-0 mt-0.5">
                    @if($notice->reward_gold > 0)
                        <span>🎁</span>
                    @else
                        <i class="fa-solid fa-bullhorn"></i>
                    @endif
                </span>
                <div class="space-y-1">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="text-xs font-black {{ $notice->reward_gold > 0 ? 'text-amber-400' : 'text-ninja-orange' }} uppercase tracking-wider">
                            {{ $notice->title }}
                        </span>
                        @if($notice->reward_gold > 0)
                            <span class="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 shadow-glow-gold/10">
                                <i class="fa-solid fa-gem text-amber-400 text-xs"></i>
                                Hadiah: +{{ number_format($notice->reward_gold) }} Gold
                            </span>
                        @endif
                    </div>
                    <p class="text-xs text-slate-300 leading-relaxed">{{ $notice->content }}</p>
                    <div class="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                        <i class="fa-regular fa-clock text-slate-500"></i>
                        <span>Dipublikasikan: {{ \Carbon\Carbon::parse($notice->created_at)->timezone('Asia/Jakarta')->translatedFormat('d M Y, H:i') }} WIB</span>
                    </div>
                </div>
            </div>

            <!-- Reward Claim Action & Dismiss -->
            <div class="flex items-center gap-2.5 flex-shrink-0 self-end md:self-center w-full md:w-auto justify-end">
                @if($notice->reward_gold > 0 && !$hasClaimedNotice)
                    <form action="{{ route('player.notice.claim', $notice->id) }}" method="POST">
                        @csrf
                        <button type="submit" class="btn-ninja-gold px-4 py-2 font-black text-xs flex items-center gap-2 shadow-glow-gold hover:scale-105 transition-all">
                            <i class="fa-solid fa-gift text-sm"></i>
                            <span>Klaim +{{ number_format($notice->reward_gold) }} Gold</span>
                        </button>
                    </form>
                @endif

                <!-- Close / Dismiss button -->
                <button type="button" onclick="dismissNotice('playerNoticeBanner')" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Tutup pengumuman">
                    <i class="fa-solid fa-xmark text-sm"></i>
                </button>
            </div>
        </div>
    @endif

    <!-- Top Hero Section: Deployed Main Ninja Showcase -->
    <div class="glass-panel p-6 sm:p-8 relative overflow-hidden">
        <!-- Background element glowing effect -->
        <div class="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-ninja-orange/10 blur-3xl pointer-events-none"></div>

        <div class="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
            <!-- Left Info -->
            <div class="space-y-4 max-w-xl text-center lg:text-left">
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-ninja-cyan">
                    <span class="w-2 h-2 rounded-full bg-ninja-cyan animate-pulse"></span>
                    Shinobi Rank: Level {{ $user->level }} (VIP {{ $user->vip_level }})
                </div>

                <h1 class="font-title font-black text-3xl sm:text-4xl text-white tracking-wide">
                    SELAMAT DATANG, <span class="text-ninja-orange">{{ strtoupper($user->username) }}</span>!
                </h1>

                <p class="text-sm text-slate-300 leading-relaxed">
                    Kembangkan tim ninjamu, lakukan rekrutmen di Ninja Hut & Special Claw Crane, kombinasikan shinobi untuk berevolusi, dan taklukkan Ujian Menara Ninja!
                </p>

                <!-- Action Button Cluster -->
                <div class="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                    <a href="{{ route('player.gacha') }}" class="btn-ninja-primary">
                        <i class="fa-solid fa-torii-gate"></i> Rekrut Ninja Sekarang
                    </a>
                    <a href="{{ route('player.arena') }}" class="btn-ninja-cyan">
                        <i class="fa-solid fa-khanda"></i> Tantang Ujian (Floor {{ $user->exam_floor }})
                    </a>
                    <a href="{{ route('player.team') }}" class="btn-ninja-secondary">
                        <i class="fa-solid fa-users"></i> Atur Tim
                    </a>
                </div>
            </div>

            <!-- Right: Active Main Ninja Card Showcase -->
            @if($user->mainNinja && $user->mainNinja->master)
                @php 
                    $main = $user->mainNinja; 
                    $master = $main->master;
                @endphp
                <div class="w-full sm:w-80 glass-panel-subtle p-5 border-2 border-ninja-orange/40 relative shadow-glow-orange/20 rounded-2xl group hover:border-ninja-orange transition-all">
                    <div class="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-ninja-orange text-white">
                        MAIN DEPLOYED
                    </div>

                    <div class="flex items-center gap-4 mb-4">
                        <div class="w-16 h-16 rounded-xl ninja-frame-{{ $master->grade }} bg-black overflow-hidden shadow-lg flex-shrink-0">
                            <img src="{{ asset('images/ninja_heads/' . ($master->xmlfile ?? 'mingren') . '_h.png') }}" alt="{{ $master->name }}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='{{ asset('images/ninja_heads/mingren_h.png') }}';">
                        </div>
                        <div>
                            <span class="inline-block px-2 py-0.5 rounded text-[10px] font-black badge-grade-{{ $master->grade }}">
                                GRADE {{ $master->grade }}
                            </span>
                            <h3 class="font-bold text-white text-base mt-1 leading-tight">{{ $master->name }}</h3>
                            <div class="text-[11px] text-slate-400">Level {{ $main->level }} • [{{ $master->element ?? 'Neutral' }}]</div>
                        </div>
                    </div>

                    <!-- Combat Stats Grid -->
                    <div class="grid grid-cols-2 gap-2 p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-xs">
                        <div class="flex justify-between items-center text-slate-300">
                            <span class="text-slate-500 font-sans text-[10px] uppercase font-bold">ATK:</span>
                            <span class="font-bold text-white">{{ number_format($main->atk) }}</span>
                        </div>
                        <div class="flex justify-between items-center text-slate-300">
                            <span class="text-slate-500 font-sans text-[10px] uppercase font-bold">DEF:</span>
                            <span class="font-bold text-white">{{ number_format($main->def) }}</span>
                        </div>
                        <div class="flex justify-between items-center text-slate-300">
                            <span class="text-slate-500 font-sans text-[10px] uppercase font-bold">HP:</span>
                            <span class="font-bold text-white">{{ number_format($main->hp) }}</span>
                        </div>
                        <div class="flex justify-between items-center text-slate-300">
                            <span class="text-slate-500 font-sans text-[10px] uppercase font-bold">AGI:</span>
                            <span class="font-bold text-white">{{ number_format($main->speed) }}</span>
                        </div>
                    </div>

                    <!-- 3-Ninja Battle Formation Lineup Preview -->
                    @if($deployedNinjas->isNotEmpty())
                        <div class="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Formasi Tempur:</span>
                            <div class="flex items-center gap-1.5">
                                @foreach([1, 2, 3] as $sNum)
                                    @php $sNinja = $deployedNinjas->firstWhere('is_main', $sNum); @endphp
                                    @if($sNinja && $sNinja->master)
                                        <div class="w-8 h-8 rounded-lg ninja-frame-{{ $sNinja->master->grade }} bg-black overflow-hidden shadow-sm" title="Slot {{ $sNum }}: {{ $sNinja->master->name }}">
                                            <img src="{{ asset('images/ninja_heads/' . ($sNinja->master->xmlfile ?? 'mingren') . '_h.png') }}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='{{ asset('images/ninja_heads/mingren_h.png') }}';">
                                        </div>
                                    @else
                                        <div class="w-8 h-8 rounded-lg border border-dashed border-white/20 bg-black/40 flex items-center justify-center text-[10px] text-slate-500 font-bold" title="Slot {{ $sNum }} Kosong">
                                            {{ $sNum }}
                                        </div>
                                    @endif
                                @endforeach
                            </div>
                        </div>
                    @endif

                    <a href="{{ route('player.team') }}" class="mt-3 block text-center text-xs font-bold text-ninja-cyan hover:underline">
                        Atur Formasi 3 Shinobi di Team →
                    </a>
                </div>
            @endif
        </div>
    </div>

    <!-- Quick Stats Cards Row -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <!-- Stat 1: Total Ninjas -->
        <div class="glass-panel p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-lg flex-shrink-0">
                <i class="fa-solid fa-users"></i>
            </div>
            <div>
                <div class="text-[11px] text-slate-400 font-semibold">Koleksi Shinobi</div>
                <div class="text-lg font-black text-white font-mono">{{ $totalNinjas }} <span class="text-xs font-normal text-slate-500">Ninja</span></div>
            </div>
        </div>

        <!-- Stat 2: Highest Grade Ninja -->
        <div class="glass-panel p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center text-lg flex-shrink-0">
                <i class="fa-solid fa-crown"></i>
            </div>
            <div>
                <div class="text-[11px] text-slate-400 font-semibold">Shinobi Tertinggi</div>
                <div class="text-sm font-black text-pink-400 truncate max-w-[120px]">
                    {{ $highestGradeNinja ? $highestGradeNinja->master->name : 'None' }}
                </div>
            </div>
        </div>

        <!-- Stat 3: Exam Tower Floor -->
        <div class="glass-panel p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg flex-shrink-0">
                <i class="fa-solid fa-dungeon"></i>
            </div>
            <div>
                <div class="text-[11px] text-slate-400 font-semibold">Ujian Tertinggi</div>
                <div class="text-lg font-black text-amber-400 font-mono">Floor {{ $user->exam_floor }}</div>
            </div>
        </div>

        <!-- Stat 4: UR Pity Tracker -->
        <div class="glass-panel p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-ninja-orange/20 text-ninja-orange flex items-center justify-center text-lg flex-shrink-0">
                <i class="fa-solid fa-gem"></i>
            </div>
            <div>
                <div class="text-[11px] text-slate-400 font-semibold">Pity UR Terkumpul</div>
                <div class="text-lg font-black text-ninja-orange font-mono">{{ $user->gacha_pity }} / 50</div>
            </div>
        </div>
    </div>

    <!-- Quick Navigation Feature Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <!-- Feature 1: Gacha Hut & Crane -->
        <a href="{{ route('player.gacha') }}" class="glass-panel p-6 group hover:border-ninja-orange/60 transition-all flex flex-col justify-between">
            <div>
                <div class="w-12 h-12 rounded-2xl bg-ninja-orange/20 text-ninja-orange flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform shadow-glow-orange/20">
                    🏮
                </div>
                <h3 class="font-title font-bold text-lg text-white mb-2 group-hover:text-ninja-orange transition-colors">
                    Ninja Hut & Crane
                </h3>
                <p class="text-xs text-slate-400 leading-relaxed mb-4">
                    Rekrut ninja otentik dari Basic Capture, Advanced, Special 10-Combo, dan Special Claw Crane (Gedung 17) dengan jaminan Pity UR!
                </p>
            </div>
            <span class="text-xs font-bold text-ninja-orange flex items-center gap-1">
                Kunjungi Rekrutmen <i class="fa-solid fa-arrow-right text-[10px]"></i>
            </span>
        </a>

        <!-- Feature 2: Ninja Combine -->
        <a href="{{ route('player.combine') }}" class="glass-panel p-6 group hover:border-purple-500/60 transition-all flex flex-col justify-between">
            <div>
                <div class="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                    🔮
                </div>
                <h3 class="font-title font-bold text-lg text-white mb-2 group-hover:text-purple-400 transition-colors">
                    Ninja Combine
                </h3>
                <p class="text-xs text-slate-400 leading-relaxed mb-4">
                    Kombinasikan 3–5 ninja dari Grade yang sama untuk berevolusi ke Grade berikutnya hingga mencapai Shinobi Legendaris UR!
                </p>
            </div>
            <span class="text-xs font-bold text-purple-400 flex items-center gap-1">
                Buka Sintesis <i class="fa-solid fa-arrow-right text-[10px]"></i>
            </span>
        </a>

        <!-- Feature 3: Game Client APK -->
        <a href="{{ route('player.apk') }}" class="glass-panel p-6 group hover:border-ninja-cyan/60 transition-all flex flex-col justify-between">
            <div>
                <div class="w-12 h-12 rounded-2xl bg-ninja-cyan/20 text-ninja-cyan flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform shadow-glow-cyan/20">
                    📱
                </div>
                <h3 class="font-title font-bold text-lg text-white mb-2 group-hover:text-ninja-cyan transition-colors">
                    Download APK Game
                </h3>
                <p class="text-xs text-slate-400 leading-relaxed mb-4">
                    Unduh file APK resmi Ninja Heroes Private Server untuk dimainkan di perangkat Android atau emulator (LDPlayer / Bluestacks).
                </p>
            </div>
            <span class="text-xs font-bold text-ninja-cyan flex items-center gap-1">
                Unduh Client APK <i class="fa-solid fa-arrow-right text-[10px]"></i>
            </span>
        </a>
    </div>

</div>
@endsection

@push('scripts')
<script>
    function dismissNotice(id) {
        const el = document.getElementById(id);
        if (el) {
            el.style.transition = 'all 0.3s ease';
            el.style.opacity = '0';
            el.style.transform = 'translateY(-10px)';
            setTimeout(() => el.remove(), 300);
        }
    }
</script>
@endpush
