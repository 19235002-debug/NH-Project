@extends('layouts.player')

@section('title', 'Battle Arena & Exam Tower - Ninja Heroes')

@section('content')
<div class="space-y-6">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="font-title font-black text-2xl sm:text-3xl text-white tracking-wide">
                ⚔️ NINJA EXAM TOWER
            </h1>
            <p class="text-xs sm:text-sm text-slate-400 mt-1">
                Uji kekuatan Main Ninjamu di Menara Ujian Ninja untuk mengklaim Silver, Gold, dan EXP!
            </p>
        </div>
        <div class="flex items-center gap-3">
            <span class="px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 font-mono font-bold text-xs">
                Lantai Anda: Floor {{ $currentFloor }}
            </span>
            <span class="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold">
                <i class="fa-solid fa-bolt text-amber-400 mr-1"></i> Biaya: 10 Stamina
            </span>
        </div>
    </div>

    <!-- Battle Result Card if available -->
    @if(session('battle_result'))
        @php $res = session('battle_result'); @endphp
        <div class="glass-panel p-6 border-2 {{ $res['won'] ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-red-500/60 bg-red-500/5' }} mb-6">
            <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <h3 class="font-title font-black text-lg {{ $res['won'] ? 'text-emerald-400' : 'text-red-400' }} flex items-center gap-2">
                    <i class="fa-solid {{ $res['won'] ? 'fa-trophy text-amber-400' : 'fa-skull text-red-500' }}"></i>
                    LAPORAN PERTEMPURAN: LANTAI {{ $res['floor'] }} (vs {{ $res['boss'] }})
                </h3>
                <span class="px-3 py-1 rounded-full text-xs font-black uppercase {{ $res['won'] ? 'bg-emerald-500 text-slate-950' : 'bg-red-500 text-white' }}">
                    {{ $res['won'] ? 'VICTORY' : 'DEFEAT' }}
                </span>
            </div>

            <!-- Round Log terminal -->
            <div class="space-y-2 max-h-60 overflow-y-auto p-3 rounded-xl bg-black/60 font-mono text-xs border border-white/5">
                @foreach($res['logs'] as $l)
                    <div class="text-amber-400 font-bold border-b border-white/5 pb-1">-- ROUND {{ $l['round'] }} --</div>
                    @foreach($l['actions'] as $act)
                        <div class="text-slate-300 pl-2 leading-relaxed">› {{ $act }}</div>
                    @endforeach
                @endforeach
            </div>
        </div>
    @endif

    <!-- Floors Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @foreach($floors as $f)
            @php 
                $isCleared = ($f->floor < $currentFloor);
                $isCurrent = ($f->floor == $currentFloor);
                $isLocked = ($f->floor > $currentFloor);
                $enemy = $f->enemy;
            @endphp
            <div class="glass-panel p-5 flex flex-col justify-between border-2 transition-all relative group {{ $isCurrent ? 'border-ninja-orange/80 shadow-glow-orange/20 bg-ninja-orange/5' : ($isCleared ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/5 opacity-70') }}">
                <!-- Floor Badge -->
                <div class="flex items-center justify-between mb-4">
                    <span class="px-3 py-1 rounded-xl text-xs font-mono font-black {{ $isCurrent ? 'bg-ninja-orange text-white shadow-glow-orange/30' : ($isCleared ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-white/5 text-slate-500') }}">
                        LANTAI {{ $f->floor }}
                    </span>
                    @if($isCleared)
                        <span class="text-xs font-black text-emerald-400 flex items-center gap-1">
                            <i class="fa-solid fa-circle-check"></i> Cleared
                        </span>
                    @elseif($isCurrent)
                        <span class="text-xs font-black text-ninja-orange animate-pulse flex items-center gap-1">
                            <i class="fa-solid fa-crosshairs"></i> Target Aktif
                        </span>
                    @else
                        <span class="text-xs text-slate-500 flex items-center gap-1">
                            <i class="fa-solid fa-lock"></i> Terkunci
                        </span>
                    @endif
                </div>

                <!-- Boss info -->
                <div class="flex items-center gap-3.5 mb-4">
                    <div class="w-14 h-14 rounded-xl ninja-frame-{{ $enemy->grade ?? 'B' }} bg-black overflow-hidden flex-shrink-0 shadow-md">
                        <img src="{{ asset('images/ninja_heads/' . ($enemy->xmlfile ?? 'mingren') . '_h.png') }}" alt="" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='{{ asset('images/ninja_heads/mingren_h.png') }}';">
                    </div>
                    <div>
                        <div class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Guardian Boss:</div>
                        <h3 class="font-bold text-white text-sm">{{ $f->enemy_name ?: ($enemy ? $enemy->name : 'Ninja Guardian') }}</h3>
                        <span class="inline-block px-1.5 py-0.2 rounded text-[9px] font-black badge-grade-{{ $enemy->grade ?? 'B' }}">
                            GRADE {{ $enemy->grade ?? 'B' }}
                        </span>
                    </div>
                </div>

                <!-- Rewards Preview -->
                <div class="p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs font-mono space-y-1 mb-4 text-slate-300">
                    <div class="flex justify-between items-center">
                        <span class="text-slate-500 font-sans text-[10px]">Hadiah Silver:</span>
                        <span class="text-slate-200 font-bold">+{{ number_format($f->reward_silver ?: ($f->floor * 5000)) }}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-slate-500 font-sans text-[10px]">Hadiah Gold:</span>
                        <span class="text-amber-400 font-bold">+{{ $f->reward_gold ?: ($f->floor * 10) }}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-slate-500 font-sans text-[10px]">Hadiah EXP:</span>
                        <span class="text-ninja-cyan font-bold">+{{ $f->reward_exp ?: ($f->floor * 200) }}</span>
                    </div>
                </div>

                <!-- Challenge Form -->
                <form action="{{ route('player.arena.challenge', $f->floor) }}" method="POST">
                    @csrf
                    <button type="submit" {{ $isLocked ? 'disabled' : '' }} class="w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 {{ $isCurrent ? 'btn-ninja-primary' : ($isCleared ? 'btn-ninja-secondary' : 'bg-white/5 text-slate-600 cursor-not-allowed') }}">
                        <i class="fa-solid fa-khanda"></i>
                        {{ $isCurrent ? 'Tantang Lantai Ini' : ($isCleared ? 'Ulangi Tantangan' : 'Lantai Terkunci') }}
                    </button>
                </form>
            </div>
        @endforeach
    </div>

</div>
@endsection
