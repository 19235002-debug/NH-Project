@extends('layouts.player')

@section('title', 'Formasi Tim, Papan Deploy 12 Slot & Jutsu - Ninja Heroes')

@section('content')
<div class="space-y-8 pb-12">

    <!-- Header & Formation Summary -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
            <div class="flex flex-wrap items-center gap-2 mb-1">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-ninja-orange/20 text-ninja-orange border border-ninja-orange/30">
                    Sistem Tempur Otentik APK
                </span>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Papan Deploy 12 Slot
                </span>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Maks Level 150
                </span>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    VIP {{ $user->vip_level }} {{ $user->vip_level >= 3 ? '(Slot 5 Terbuka)' : '' }}
                </span>
            </div>
            <h1 class="font-title font-black text-2xl sm:text-3xl text-white tracking-wide flex items-center gap-3">
                <span class="text-ninja-orange">⚔️</span> FORMASI TEMPUR, DEPLOY 12 SLOT & JUTSU
            </h1>
            <p class="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
                Pasang 3 Shinobi tempur utama dan manfaatkan 12 Slot Papan Deploy (HouYuanTuan) untuk mengaktifkan seluruh Sinergi Combo Skill (ZuHeJi). Setiap ninja memiliki 4 slot skill default (kosong), slot ke-5 (VIP 3+), 1 Summon Jutsu, dan 1 Bijuu Jutsu.
            </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
            <!-- Total Team CP with Combo Multiplier -->
            <div class="glass-panel px-4 py-2.5 border-amber-500/40 text-right min-w-[170px] shadow-glow-gold/10">
                <div class="flex items-center justify-between gap-2 text-[10px] text-amber-400 uppercase font-black tracking-wider">
                    <span>Total Team CP</span>
                    @if($bonusStats['atk'] > 0 || $bonusStats['def'] > 0 || $bonusStats['hp'] > 0 || $bonusStats['speed'] > 0)
                        <span class="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold">
                            Buff Combo Aktif
                        </span>
                    @endif
                </div>
                <div class="text-xl font-black text-white font-mono flex items-center justify-end gap-1.5 mt-0.5">
                    <i class="fa-solid fa-fire-flame-curved text-amber-400 text-sm"></i>
                    <span>{{ number_format($totalTeamCp) }} CP</span>
                </div>
            </div>

            <!-- Gacha Jutsu Trigger Button -->
            <button type="button" onclick="openGachaJutsuModal()" class="btn-ninja-cyan text-xs py-2.5 px-4 shadow-glow-cyan/20 flex items-center justify-center gap-2">
                <i class="fa-solid fa-scroll"></i> Gacha Jutsu
            </button>

            <!-- Gacha Ninja Button -->
            <a href="{{ route('player.gacha') }}" class="btn-ninja-primary text-xs py-2.5 px-4 shadow-glow-orange/30 flex items-center justify-center gap-2">
                <i class="fa-solid fa-user-plus"></i> Rekrut Shinobi
            </a>
        </div>
    </div>

    <!-- 1. 3 COMBAT FORMATION SLOTS (FORMASI TEMPUR 3 SHINOBI) -->
    <div class="glass-panel p-5 sm:p-6 border-2 border-ninja-orange/40 relative overflow-hidden shadow-2xl">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-white/10">
            <div>
                <h2 class="font-title font-bold text-base text-white flex items-center gap-2">
                    <i class="fa-solid fa-shield-halved text-ninja-orange"></i>
                    LINEUP TEMPUR UTAMA (3 SHINOBI GARIS DEPAN)
                </h2>
                <p class="text-xs text-slate-400 mt-0.5">3 Shinobi yang bertarung langsung di Exam, Arena, dan Misi Cerita.</p>
            </div>
            <span class="text-[11px] text-amber-400 font-mono bg-black/40 px-3 py-1 rounded-lg border border-amber-500/20">
                Urutan Serang: Slot 1 (Leader) → Slot 2 (Mid) → Slot 3 (Rear)
            </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            @php
                $combatSlots = [
                    1 => [
                        'name' => 'SLOT 1 - LEADER (VANGUARD)',
                        'desc' => 'Petarung Utama & Avatar Profil',
                        'ninja' => $slot1,
                        'border' => 'border-amber-500/70 shadow-glow-gold/20 bg-amber-500/5',
                        'badge' => 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black',
                        'accent' => 'text-amber-400'
                    ],
                    2 => [
                        'name' => 'SLOT 2 - MID COMBATANT',
                        'desc' => 'Petarung Lini Tengah',
                        'ninja' => $slot2,
                        'border' => 'border-ninja-cyan/70 shadow-glow-cyan/20 bg-ninja-cyan/5',
                        'badge' => 'bg-gradient-to-r from-ninja-cyan to-teal-400 text-black',
                        'accent' => 'text-ninja-cyan'
                    ],
                    3 => [
                        'name' => 'SLOT 3 - REAR ANCHOR',
                        'desc' => 'Petarung Pengunci & Penentu',
                        'ninja' => $slot3,
                        'border' => 'border-purple-500/70 shadow-lg bg-purple-500/5',
                        'badge' => 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white',
                        'accent' => 'text-purple-400'
                    ]
                ];
            @endphp

            @foreach($combatSlots as $slotIdx => $cSlot)
                @php $ninja = $cSlot['ninja']; @endphp
                <div class="rounded-2xl p-4 border-2 {{ $cSlot['border'] }} relative flex flex-col justify-between transition-all">
                    <!-- Slot Header -->
                    <div class="flex items-center justify-between mb-3">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider {{ $cSlot['badge'] }}">
                            {{ $cSlot['name'] }}
                        </span>
                        @if($ninja)
                            <span class="text-[11px] font-mono font-bold text-slate-300">
                                {{ number_format($ninja->combat_power) }} CP
                            </span>
                        @endif
                    </div>

                    @if($ninja && $ninja->master)
                        @php $m = $ninja->master; @endphp
                        <div>
                            <!-- Ninja Identity -->
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-16 h-16 rounded-xl ninja-frame-{{ $m->grade }} bg-black overflow-hidden flex-shrink-0 shadow-md">
                                    <img src="{{ asset('images/ninja_heads/' . ($m->xmlfile ?? 'mingren') . '_h.png') }}" 
                                         alt="{{ $m->name }}" 
                                         class="w-full h-full object-cover" 
                                         onerror="this.onerror=null;this.src='{{ asset('images/ninja_heads/mingren_h.png') }}';">
                                </div>
                                <div class="overflow-hidden flex-1">
                                    <div class="flex items-center gap-1.5">
                                        <span class="px-1.5 py-0.2 rounded text-[9px] font-black badge-grade-{{ $m->grade }}">
                                            GRADE {{ $m->grade }}
                                        </span>
                                        <span class="text-[10px] text-amber-300 font-mono font-bold">Lv. {{ $ninja->level }} / 150</span>
                                    </div>
                                    <h3 class="font-bold text-white text-base truncate mt-0.5" title="{{ $m->name }}">{{ $m->name }}</h3>
                                    <div class="text-[10px] text-slate-400 truncate">Elemen: <span class="{{ $cSlot['accent'] }} font-semibold">{{ $m->element ?? 'Neutral' }}</span></div>
                                </div>
                            </div>

                            <!-- Combat Stats Grid -->
                            <div class="grid grid-cols-2 gap-1.5 p-2.5 rounded-xl bg-black/60 border border-white/5 font-mono text-xs mb-3">
                                <div class="flex justify-between items-center text-slate-300">
                                    <span class="text-slate-500 font-sans text-[10px] font-bold">ATK:</span>
                                    <span class="font-bold text-white">{{ number_format($ninja->atk) }}</span>
                                </div>
                                <div class="flex justify-between items-center text-slate-300">
                                    <span class="text-slate-500 font-sans text-[10px] font-bold">DEF:</span>
                                    <span class="font-bold text-white">{{ number_format($ninja->def) }}</span>
                                </div>
                                <div class="flex justify-between items-center text-slate-300">
                                    <span class="text-slate-500 font-sans text-[10px] font-bold">HP:</span>
                                    <span class="font-bold text-white">{{ number_format($ninja->hp) }}</span>
                                </div>
                                <div class="flex justify-between items-center text-slate-300">
                                    <span class="text-slate-500 font-sans text-[10px] font-bold">AGI:</span>
                                    <span class="font-bold text-white">{{ number_format($ninja->speed) }}</span>
                                </div>
                            </div>

                            <!-- Special Jutsu Info -->
                            @if($m->specialJutsu)
                                <div class="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2 mb-3">
                                    <div class="w-7 h-7 rounded-lg bg-black overflow-hidden flex-shrink-0 border border-white/10">
                                        <img src="{{ asset('images/skills/' . ($m->specialJutsu->icon ?? 'skill_001') . '.png') }}" 
                                             alt="" 
                                             class="w-full h-full object-cover" 
                                             onerror="this.onerror=null;this.src='{{ asset('images/skills/skill_001.png') }}';">
                                    </div>
                                    <div class="overflow-hidden">
                                        <div class="text-[11px] font-bold text-amber-300 truncate">{{ $m->specialJutsu->name }}</div>
                                        <div class="text-[9px] text-slate-400 truncate">{{ $m->specialJutsu->category ?? 'Ninjutsu' }} (Jutsu Bawaan)</div>
                                    </div>
                                </div>
                            @endif
                        </div>

                        <!-- Slot Actions -->
                        <div class="flex items-center gap-2 pt-2 border-t border-white/10">
                            <form action="{{ route('player.team.remove-slot', $ninja->id) }}" method="POST" class="flex-1">
                                @csrf
                                <button type="submit" class="w-full py-1.5 px-2 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-300 border border-white/10 text-[11px] font-semibold text-slate-400 transition-colors" title="Lepas Shinobi ini dari formasi">
                                    <i class="fa-solid fa-arrow-down mr-1"></i> Lepas ke Cadangan
                                </button>
                            </form>
                        </div>
                    @else
                        <!-- Empty Slot State -->
                        <div class="py-10 text-center flex flex-col items-center justify-center text-slate-500 space-y-2 border-2 border-dashed border-white/10 rounded-xl my-2">
                            <span class="text-3xl opacity-30">🥷</span>
                            <div class="text-xs font-bold text-slate-400">Slot {{ $slotIdx }} Kosong</div>
                            <p class="text-[10px] text-slate-500 max-w-[180px] leading-tight">Pilih Shinobi dari daftar cadangan di bawah untuk mengisi posisi ini.</p>
                        </div>
                    @endif
                </div>
            @endforeach
        </div>
    </div>

    <!-- 2. PAPAN DEPLOY 12 SLOT (HOU YUAN TUAN / DEPLOY BOARD) -->
    <div class="glass-panel p-5 sm:p-6 border-2 border-emerald-500/40 relative overflow-hidden shadow-2xl">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-white/10">
            <div>
                <h2 class="font-title font-bold text-base text-white flex items-center gap-2">
                    <span class="text-emerald-400">🛡️</span>
                    PAPAN DEPLOY (HOU YUAN TUAN - 12 SLOT DUKUNGAN)
                </h2>
                <p class="text-xs text-slate-400 mt-0.5">
                    Shinobi di Papan Deploy tidak bertarung di garis depan, namun keberadaan mereka mengaktifkan <strong class="text-emerald-400">Sinergi Combo Skill (ZuHeJi)</strong> untuk seluruh tim!
                </p>
            </div>
            <span class="text-[11px] text-emerald-400 font-mono bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-500/30">
                Kapasitas: {{ collect($deploySlots)->filter()->count() }} / 12 Terisi
            </span>
        </div>

        <!-- 12 Deploy Slots Grid (6 cols on lg, 4 on sm, 2 on xs) -->
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            @for($dSlot = 1; $dSlot <= 12; $dSlot++)
                @php $dNinja = $deploySlots[$dSlot] ?? null; @endphp
                <div class="rounded-xl p-2.5 border transition-all flex flex-col justify-between {{ $dNinja ? 'border-emerald-500/60 bg-emerald-500/10 shadow-glow-cyan/10' : 'border-dashed border-white/10 bg-black/30' }}">
                    
                    <!-- Slot Label -->
                    <div class="flex items-center justify-between mb-2">
                        <span class="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider {{ $dNinja ? 'bg-emerald-500 text-black' : 'bg-white/10 text-slate-400' }}">
                            SLOT D{{ $dSlot }}
                        </span>
                        @if($dNinja)
                            <span class="text-[9px] font-mono text-emerald-300 font-bold">
                                Lv.{{ $dNinja->level }}
                            </span>
                        @endif
                    </div>

                    @if($dNinja && $dNinja->master)
                        @php $dm = $dNinja->master; @endphp
                        <div class="text-center">
                            <div class="w-12 h-12 mx-auto rounded-xl ninja-frame-{{ $dm->grade }} bg-black overflow-hidden shadow-sm relative group">
                                <img src="{{ asset('images/ninja_heads/' . ($dm->xmlfile ?? 'mingren') . '_h.png') }}" 
                                     alt="{{ $dm->name }}" 
                                     class="w-full h-full object-cover" 
                                     onerror="this.onerror=null;this.src='{{ asset('images/ninja_heads/mingren_h.png') }}';">
                                <div class="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] font-bold text-amber-300 truncate">
                                    {{ $dm->grade }}
                                </div>
                            </div>
                            <div class="font-bold text-white text-[11px] truncate mt-1.5" title="{{ $dm->name }}">
                                {{ $dm->name }}
                            </div>
                            <div class="text-[9px] text-slate-400 font-mono">
                                {{ number_format($dNinja->combat_power) }} CP
                            </div>

                            <!-- Remove from Deploy Button -->
                            <form action="{{ route('player.team.remove-deploy', $dNinja->id) }}" method="POST" class="mt-2">
                                @csrf
                                <button type="submit" class="w-full py-1 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 text-[9px] font-bold border border-red-500/30 transition-colors" title="Lepas Shinobi dari Deploy">
                                    Lepas
                                </button>
                            </form>
                        </div>
                    @else
                        <!-- Empty Deploy Slot -->
                        <div class="py-6 text-center flex flex-col items-center justify-center text-slate-500">
                            <i class="fa-solid fa-plus text-xs opacity-40 mb-1"></i>
                            <span class="text-[9px] font-bold text-slate-500">Kosong</span>
                        </div>
                    @endif
                </div>
            @endfor
        </div>
    </div>

    <!-- 3. COMBO SKILL (ZU HE JI) & STAT BUFF PANEL (100% PARSED DARI 262 COMBOS) -->
    <div class="glass-panel p-5 sm:p-6 border-2 border-purple-500/40 relative overflow-hidden shadow-2xl space-y-6">
        
        <!-- Header & Buff Bar -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
                <div class="flex items-center gap-2">
                    <h2 class="font-title font-bold text-base text-white flex items-center gap-2">
                        <span class="text-purple-400">⚡</span>
                        SINERGI COMBO SKILL (ZU HE JI - 组合技)
                    </h2>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {{ count($activeCombos) }} Combo Aktif
                    </span>
                </div>
                <p class="text-xs text-slate-400 mt-0.5">
                    Combo Skill otomatis aktif bila seluruh Shinobi yang diperlukan berada di Formasi Tempur Utama ATAU Papan Deploy (12 Slot).
                </p>
            </div>

            <!-- Active Buff Stat Pills -->
            <div class="flex flex-wrap items-center gap-2">
                <div class="px-2.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-1.5 text-xs font-mono">
                    <span class="text-red-400 font-bold">ATK</span>
                    <span class="font-black text-white">+{{ $bonusStats['atk'] }}%</span>
                </div>
                <div class="px-2.5 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center gap-1.5 text-xs font-mono">
                    <span class="text-blue-400 font-bold">DEF</span>
                    <span class="font-black text-white">+{{ $bonusStats['def'] }}%</span>
                </div>
                <div class="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1.5 text-xs font-mono">
                    <span class="text-emerald-400 font-bold">HP</span>
                    <span class="font-black text-white">+{{ $bonusStats['hp'] }}%</span>
                </div>
                <div class="px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-1.5 text-xs font-mono">
                    <span class="text-amber-400 font-bold">AGI</span>
                    <span class="font-black text-white">+{{ $bonusStats['speed'] }}%</span>
                </div>
                @if($bonusStats['backup_attacks'] > 0)
                    <div class="px-2.5 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center gap-1.5 text-xs font-mono shadow-glow-cyan/10">
                        <span class="text-purple-300 font-bold">BACKUP ATK</span>
                        <span class="font-black text-amber-300">+{{ $bonusStats['backup_attacks'] }}</span>
                    </div>
                @endif
            </div>
        </div>

        <!-- ACTIVE COMBOS LIST -->
        <div>
            <h3 class="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-3">
                <i class="fa-solid fa-circle-check text-emerald-400"></i>
                COMBO SKILL YANG SEDANG AKTIF ({{ count($activeCombos) }})
            </h3>

            @if(count($activeCombos) > 0)
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    @foreach($activeCombos as $ac)
                        @php 
                            $combo = $ac['combo']; 
                            $roles = $ac['roles'];
                        @endphp
                        <div class="rounded-xl p-3 bg-gradient-to-br from-amber-500/10 via-black/60 to-purple-500/10 border border-amber-500/50 shadow-glow-gold/10 relative">
                            <div class="flex items-center justify-between mb-2">
                                <span class="font-bold text-white text-sm flex items-center gap-1.5">
                                    <span class="text-amber-400">✨</span> {{ $combo->name }}
                                </span>
                                <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    AKTIF
                                </span>
                            </div>

                            <p class="text-[11px] text-slate-300 leading-snug mb-3">
                                {{ $combo->description }}
                            </p>

                            <!-- Required Ninjas & Placement Status -->
                            <div class="pt-2 border-t border-white/10 flex items-center gap-2 overflow-x-auto pb-1">
                                @foreach($roles as $rNinja)
                                    @php
                                        $inCombat = in_array($rNinja->id, $combatMasterIds);
                                        $inDeploy = in_array($rNinja->id, $deployMasterIds);
                                    @endphp
                                    <div class="flex items-center gap-1.5 px-2 py-1 rounded-lg {{ $inCombat ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' }} text-[10px] whitespace-nowrap">
                                        <div class="w-4 h-4 rounded overflow-hidden flex-shrink-0">
                                            <img src="{{ asset('images/ninja_heads/' . ($rNinja->xmlfile ?? 'mingren') . '_h.png') }}" class="w-full h-full object-cover">
                                        </div>
                                        <span class="font-semibold">{{ $rNinja->name }}</span>
                                        <span class="text-[9px] opacity-80">
                                            ({{ $inCombat ? 'Formasi' : 'Deploy' }})
                                        </span>
                                    </div>
                                @endforeach
                            </div>
                        </div>
                    @endforeach
                </div>
            @else
                <div class="p-6 rounded-xl bg-black/40 border border-white/10 text-center text-slate-400 text-xs">
                    <p class="mb-1 font-semibold text-slate-300">Belum ada Combo Skill yang aktif.</p>
                    <p class="text-[11px] text-slate-500">
                        Pasang pasangan Shinobi yang bersinergi (misalnya Tim 7: Naruto + Sasuke + Sakura) di Formasi Tempur atau Papan Deploy untuk mengaktifkan Combo Skill!
                    </p>
                </div>
            @endif
        </div>

        <!-- POTENTIAL / INCOMPLETE COMBOS LIST -->
        @if(count($potentialCombos) > 0)
            <div class="pt-2 border-t border-white/10">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <i class="fa-solid fa-lightbulb text-amber-400"></i>
                        PELUANG COMBO DARI SHINOBI YANG ANDA MILIKI ({{ count($potentialCombos) }})
                    </h3>
                    <span class="text-[10px] text-slate-500">Urut berdasarkan peluang tertinggi</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
                    @foreach($potentialCombos as $pc)
                        @php 
                            $combo = $pc['combo']; 
                            $roles = $pc['roles'];
                            $matchedCount = $pc['matched_count'];
                            $totalCount = $pc['total_count'];
                            $hasAll = $pc['has_all_in_roster'];
                        @endphp
                        <div class="rounded-xl p-3 bg-black/40 border {{ $hasAll ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-white/10' }}">
                            <div class="flex items-center justify-between mb-1.5">
                                <span class="font-bold text-white text-xs truncate" title="{{ $combo->name }}">
                                    {{ $combo->name }}
                                </span>
                                <span class="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold {{ $hasAll ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/10 text-slate-400' }}">
                                    {{ $matchedCount }} / {{ $totalCount }}
                                </span>
                            </div>

                            @if($hasAll)
                                <div class="mb-2 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                                    <i class="fa-solid fa-sparkles text-amber-300"></i>
                                    <span>Siap Diaktifkan! Pasang ninja cadangan ke Papan Deploy.</span>
                                </div>
                            @endif

                            <p class="text-[10px] text-slate-400 line-clamp-2 mb-2.5">
                                {{ $combo->description }}
                            </p>

                            <!-- Role Badges -->
                            <div class="flex flex-wrap gap-1">
                                @foreach($roles as $rNinja)
                                    @php
                                        $inCombat = in_array($rNinja->id, $combatMasterIds);
                                        $inDeploy = in_array($rNinja->id, $deployMasterIds);
                                        $inRoster = in_array($rNinja->id, $ownedMasterIds);
                                    @endphp
                                    <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] {{ $inCombat ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : ($inDeploy ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : ($inRoster ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/5 text-slate-500 border border-white/5')) }}">
                                        @if($inCombat || $inDeploy)
                                            <i class="fa-solid fa-check text-[8px]"></i>
                                        @elseif($inRoster)
                                            <i class="fa-solid fa-box-archive text-[8px]"></i>
                                        @else
                                            <i class="fa-solid fa-xmark text-[8px]"></i>
                                        @endif
                                        <span>{{ $rNinja->name }}</span>
                                    </span>
                                @endforeach
                            </div>
                        </div>
                    @endforeach
                </div>
            </div>
        @endif
    </div>

    <!-- 4. ALL SHINOBI ROSTER (CADANGAN & MANAJEMEN 7 SLOT JUTSU) -->
    <div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
                <h2 class="font-title font-bold text-lg text-white tracking-wide flex items-center gap-2">
                    <i class="fa-solid fa-users text-slate-400"></i>
                    DAFTAR SHINOBI & MANAJEMEN JUTSU
                </h2>
                <p class="text-xs text-slate-400">
                    Kelola level (Maks Lv 150), atur penugasan (Formasi / Deploy 12 Slot), dan pasang 7 Slot Jutsu (4 Standar, Slot 5 VIP 3+, 1 Summon, 1 Bijuu).
                </p>
            </div>
            <div class="flex items-center gap-2 self-start sm:self-auto">
                <span class="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold text-slate-300">
                    Total Shinobi: <span class="text-ninja-orange">{{ $ninjas->count() }}</span>
                </span>
            </div>
        </div>

        @if($ninjas->isEmpty())
            <div class="glass-panel p-12 text-center max-w-md mx-auto">
                <div class="text-4xl mb-3">🥷</div>
                <h3 class="font-bold text-white text-base mb-1">Belum Ada Shinobi</h3>
                <p class="text-xs text-slate-400 mb-4">Anda belum merekrut ninja ke dalam tim. Kunjungi Ninja Hut sekarang!</p>
                <a href="{{ route('player.gacha') }}" class="btn-ninja-primary text-xs">Kunjungi Ninja Hut</a>
            </div>
        @else
            <!-- Ninjas Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                @foreach($ninjas as $n)
                    @php 
                        $m = $n->master;
                        $combatSlot = (int)$n->is_main;
                        $deploySlot = (int)$n->deploy_slot;
                        $upgradeCost = $n->level * 1000;
                        $isMaxLevel = $n->level >= 150;
                        $isVip5Unlocked = $user->vip_level >= 3;
                    @endphp
                    <div class="glass-panel p-4 flex flex-col justify-between border-2 transition-all relative group {{ $combatSlot === 1 ? 'border-amber-500/80 shadow-glow-gold/20 bg-amber-500/5' : ($combatSlot === 2 ? 'border-ninja-cyan/80 shadow-glow-cyan/20 bg-ninja-cyan/5' : ($combatSlot === 3 ? 'border-purple-500/80 shadow-lg bg-purple-500/5' : ($deploySlot > 0 ? 'border-emerald-500/70 shadow-glow-cyan/10 bg-emerald-500/5' : 'ninja-card-' . $m->grade))) }}">
                        
                        <!-- Deployment Status Pill -->
                        @if($combatSlot === 1)
                            <div class="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[9px] font-black uppercase tracking-wider shadow-glow-gold">
                                ⭐ SLOT 1 (LEADER)
                            </div>
                        @elseif($combatSlot === 2)
                            <div class="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-ninja-cyan to-teal-400 text-black text-[9px] font-black uppercase tracking-wider shadow-glow-cyan">
                                ⭐ SLOT 2 (MID)
                            </div>
                        @elseif($combatSlot === 3)
                            <div class="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[9px] font-black uppercase tracking-wider">
                                ⭐ SLOT 3 (REAR)
                            </div>
                        @elseif($deploySlot > 0)
                            <div class="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-black uppercase tracking-wider shadow-md">
                                🛡️ DEPLOY SLOT D{{ $deploySlot }}
                            </div>
                        @endif

                        <div>
                            <!-- Header with head avatar -->
                            <div class="flex items-center gap-3 mb-3 mt-1">
                                <div class="w-14 h-14 rounded-xl ninja-frame-{{ $m->grade }} bg-black overflow-hidden flex-shrink-0 shadow-md">
                                    <img src="{{ asset('images/ninja_heads/' . ($m->xmlfile ?? 'mingren') . '_h.png') }}" 
                                         alt="{{ $m->name }}" 
                                         class="w-full h-full object-cover" 
                                         onerror="this.onerror=null;this.src='{{ asset('images/ninja_heads/mingren_h.png') }}';">
                                </div>
                                <div class="overflow-hidden flex-1">
                                    <div class="flex items-center justify-between">
                                        <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-black badge-grade-{{ $m->grade }}">
                                            GRADE {{ $m->grade }}
                                        </span>
                                        <span class="text-[11px] font-mono text-slate-300 font-bold">
                                            {{ number_format($n->combat_power) }} CP
                                        </span>
                                    </div>
                                    <h3 class="font-bold text-white text-sm truncate mt-0.5" title="{{ $m->name }}">{{ $m->name }}</h3>
                                    <div class="text-[11px] font-mono {{ $isMaxLevel ? 'text-emerald-400' : 'text-ninja-orange' }} font-bold">
                                        Lv. {{ $n->level }} / 150 {{ $isMaxLevel ? '(MAX)' : '' }}
                                    </div>
                                </div>
                            </div>

                            <!-- Combat Stats Grid -->
                            <div class="grid grid-cols-4 gap-1 p-2 rounded-xl bg-black/40 border border-white/5 font-mono text-[10px] mb-3 text-center">
                                <div>
                                    <div class="text-[8px] text-slate-500 uppercase font-sans font-bold">ATK</div>
                                    <div class="font-bold text-white">{{ number_format($n->atk) }}</div>
                                </div>
                                <div>
                                    <div class="text-[8px] text-slate-500 uppercase font-sans font-bold">DEF</div>
                                    <div class="font-bold text-white">{{ number_format($n->def) }}</div>
                                </div>
                                <div>
                                    <div class="text-[8px] text-slate-500 uppercase font-sans font-bold">HP</div>
                                    <div class="font-bold text-white">{{ number_format($n->hp) }}</div>
                                </div>
                                <div>
                                    <div class="text-[8px] text-slate-500 uppercase font-sans font-bold">AGI</div>
                                    <div class="font-bold text-white">{{ number_format($n->speed) }}</div>
                                </div>
                            </div>

                            <!-- 7 JUTSU SLOTS (4 DEFAULT EMPTY, 1 VIP 3+, 1 SUMMON, 1 BIJUU) -->
                            <div class="mb-3 p-2.5 rounded-xl bg-black/50 border border-white/10 space-y-2">
                                <div class="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    <span class="flex items-center gap-1">
                                        <i class="fa-solid fa-scroll text-amber-400"></i> Slot Ninjutsu
                                    </span>
                                    <span class="text-[9px] text-slate-500">
                                        4 Standar • VIP 3+ • Summon • Bijuu
                                    </span>
                                </div>

                                <!-- 4 Default Ninjutsu Slots (Slot 1..4) -->
                                <div class="grid grid-cols-2 gap-1.5">
                                    @php
                                        $stdSlots = [
                                            'slot1' => ['num' => 1, 'jutsu' => $n->jutsu1, 'field' => 'jutsu_slot_1'],
                                            'slot2' => ['num' => 2, 'jutsu' => $n->jutsu2, 'field' => 'jutsu_slot_2'],
                                            'slot3' => ['num' => 3, 'jutsu' => $n->jutsu3, 'field' => 'jutsu_slot_3'],
                                            'slot4' => ['num' => 4, 'jutsu' => $n->jutsu4, 'field' => 'jutsu_slot_4'],
                                        ];
                                    @endphp

                                    @foreach($stdSlots as $sType => $sData)
                                        @php $j = $sData['jutsu']; @endphp
                                        <div class="p-1.5 rounded-lg border {{ $j ? 'border-amber-500/40 bg-amber-500/5' : 'border-dashed border-white/10 bg-white/5' }} flex items-center justify-between gap-1 text-[10px]">
                                            <div class="flex items-center gap-1.5 overflow-hidden">
                                                <div class="w-6 h-6 rounded bg-black flex-shrink-0 overflow-hidden border border-white/10">
                                                    @if($j)
                                                        <img src="{{ asset('images/skills/' . ($j->icon ?? 'skill_001') . '.png') }}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='{{ asset('images/skills/skill_001.png') }}';">
                                                    @else
                                                        <div class="w-full h-full flex items-center justify-center text-[8px] text-slate-600 font-bold">
                                                            S{{ $sData['num'] }}
                                                        </div>
                                                    @endif
                                                </div>
                                                <div class="overflow-hidden">
                                                    @if($j)
                                                        <div class="font-bold text-white truncate text-[10px]">{{ $j->name }}</div>
                                                        <div class="text-[8px] text-amber-300 font-mono">{{ $j->grade }}-Rank</div>
                                                    @else
                                                        <div class="text-[9px] text-slate-500 font-medium truncate">Slot {{ $sData['num'] }} Kosong</div>
                                                    @endif
                                                </div>
                                            </div>

                                            <div class="flex items-center gap-1 flex-shrink-0">
                                                @if($j)
                                                    <form action="{{ route('player.team.unequip-jutsu', [$n->id, $sType]) }}" method="POST">
                                                        @csrf
                                                        <button type="submit" class="w-5 h-5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-300 flex items-center justify-center text-[9px]" title="Copot Jutsu">
                                                            <i class="fa-solid fa-xmark"></i>
                                                        </button>
                                                    </form>
                                                @else
                                                    <button type="button" onclick="openEquipModal({{ $n->id }}, '{{ $sType }}', 'Slot {{ $sData['num'] }}', '{{ $m->name }}')" class="px-1.5 py-0.5 rounded bg-white/10 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 text-[9px] font-bold border border-white/10">
                                                        + Pasang
                                                    </button>
                                                @endif
                                            </div>
                                        </div>
                                    @endforeach
                                </div>

                                <!-- Slot 5 (VIP 3+ Exclusive) -->
                                <div class="p-1.5 rounded-lg border {{ $isVip5Unlocked ? ($n->jutsu5 ? 'border-amber-500/40 bg-amber-500/5' : 'border-dashed border-amber-500/20 bg-amber-500/5') : 'border-white/10 bg-black/60 opacity-60' }} flex items-center justify-between gap-1 text-[10px]">
                                    <div class="flex items-center gap-1.5 overflow-hidden">
                                        <div class="w-6 h-6 rounded bg-black flex-shrink-0 overflow-hidden border border-white/10">
                                            @if($isVip5Unlocked && $n->jutsu5)
                                                <img src="{{ asset('images/skills/' . ($n->jutsu5->icon ?? 'skill_001') . '.png') }}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='{{ asset('images/skills/skill_001.png') }}';">
                                            @else
                                                <div class="w-full h-full flex items-center justify-center text-[8px] text-amber-500 font-bold">
                                                    VIP
                                                </div>
                                            @endif
                                        </div>
                                        <div class="overflow-hidden">
                                            @if(!$isVip5Unlocked)
                                                <div class="text-[9px] text-slate-400 font-medium truncate">
                                                    🔒 Slot 5 (Terkunci: Butuh VIP 3+)
                                                </div>
                                            @elseif($n->jutsu5)
                                                <div class="font-bold text-white truncate text-[10px]">{{ $n->jutsu5->name }}</div>
                                                <div class="text-[8px] text-amber-300 font-mono">Slot VIP 3 • {{ $n->jutsu5->grade }}-Rank</div>
                                            @else
                                                <div class="text-[9px] text-amber-300 font-medium truncate">Slot 5 VIP: Kosong</div>
                                            @endif
                                        </div>
                                    </div>

                                    @if($isVip5Unlocked)
                                        <div class="flex items-center gap-1 flex-shrink-0">
                                            @if($n->jutsu5)
                                                <form action="{{ route('player.team.unequip-jutsu', [$n->id, 'slot5']) }}" method="POST">
                                                    @csrf
                                                    <button type="submit" class="w-5 h-5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-300 flex items-center justify-center text-[9px]" title="Copot Jutsu VIP">
                                                        <i class="fa-solid fa-xmark"></i>
                                                    </button>
                                                </form>
                                            @else
                                                <button type="button" onclick="openEquipModal({{ $n->id }}, 'slot5', 'Slot 5 (VIP 3+)', '{{ $m->name }}')" class="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-[9px] font-bold border border-amber-500/30">
                                                    + Pasang
                                                </button>
                                            @endif
                                        </div>
                                    @endif
                                </div>

                                <!-- Summon Jutsu & Bijuu Jutsu Slots -->
                                <div class="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/5">
                                    
                                    <!-- 1 Summon Jutsu Slot -->
                                    <div class="p-1.5 rounded-lg border {{ $n->summonJutsu ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-dashed border-cyan-500/20 bg-cyan-500/5' }} flex items-center justify-between gap-1 text-[10px]">
                                        <div class="flex items-center gap-1.5 overflow-hidden">
                                            <div class="w-6 h-6 rounded bg-black flex-shrink-0 overflow-hidden border border-cyan-500/30">
                                                @if($n->summonJutsu)
                                                    <img src="{{ asset('images/skills/' . ($n->summonJutsu->icon ?? 'skill_001') . '.png') }}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='{{ asset('images/skills/skill_001.png') }}';">
                                                @else
                                                    <div class="w-full h-full flex items-center justify-center text-[8px] text-cyan-400 font-bold">
                                                        🐾
                                                    </div>
                                                @endif
                                            </div>
                                            <div class="overflow-hidden">
                                                @if($n->summonJutsu)
                                                    <div class="font-bold text-cyan-300 truncate text-[9px]">{{ $n->summonJutsu->name }}</div>
                                                    <div class="text-[8px] text-slate-400 font-mono">Kuchiyose</div>
                                                @else
                                                    <div class="text-[9px] text-cyan-400 font-medium truncate">Summon Kosong</div>
                                                @endif
                                            </div>
                                        </div>

                                        <div class="flex items-center gap-1 flex-shrink-0">
                                            @if($n->summonJutsu)
                                                <form action="{{ route('player.team.unequip-jutsu', [$n->id, 'summon']) }}" method="POST">
                                                    @csrf
                                                    <button type="submit" class="w-5 h-5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-300 flex items-center justify-center text-[9px]" title="Copot Summon">
                                                        <i class="fa-solid fa-xmark"></i>
                                                    </button>
                                                </form>
                                            @else
                                                <button type="button" onclick="openEquipModal({{ $n->id }}, 'summon', 'Slot Kuchiyose (Summon)', '{{ $m->name }}')" class="px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 text-[9px] font-bold border border-cyan-500/30">
                                                    + Pasang
                                                </button>
                                            @endif
                                        </div>
                                    </div>

                                    <!-- 1 Bijuu Jutsu Slot -->
                                    <div class="p-1.5 rounded-lg border {{ $n->bijuJutsu ? 'border-orange-500/40 bg-orange-500/5' : 'border-dashed border-orange-500/20 bg-orange-500/5' }} flex items-center justify-between gap-1 text-[10px]">
                                        <div class="flex items-center gap-1.5 overflow-hidden">
                                            <div class="w-6 h-6 rounded bg-black flex-shrink-0 overflow-hidden border border-orange-500/30">
                                                @if($n->bijuJutsu)
                                                    <img src="{{ asset('images/skills/' . ($n->bijuJutsu->icon ?? 'skill_001') . '.png') }}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='{{ asset('images/skills/skill_001.png') }}';">
                                                @else
                                                    <div class="w-full h-full flex items-center justify-center text-[8px] text-orange-400 font-bold">
                                                        🦊
                                                    </div>
                                                @endif
                                            </div>
                                            <div class="overflow-hidden">
                                                @if($n->bijuJutsu)
                                                    <div class="font-bold text-orange-300 truncate text-[9px]">{{ $n->bijuJutsu->name }}</div>
                                                    <div class="text-[8px] text-slate-400 font-mono">Bijuu Skill</div>
                                                @else
                                                    <div class="text-[9px] text-orange-400 font-medium truncate">Bijuu Kosong</div>
                                                @endif
                                            </div>
                                        </div>

                                        <div class="flex items-center gap-1 flex-shrink-0">
                                            @if($n->bijuJutsu)
                                                <form action="{{ route('player.team.unequip-jutsu', [$n->id, 'biju']) }}" method="POST">
                                                    @csrf
                                                    <button type="submit" class="w-5 h-5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-300 flex items-center justify-center text-[9px]" title="Copot Bijuu">
                                                        <i class="fa-solid fa-xmark"></i>
                                                    </button>
                                                </form>
                                            @else
                                                <button type="button" onclick="openEquipModal({{ $n->id }}, 'biju', 'Slot Bijuu Skill', '{{ $m->name }}')" class="px-1.5 py-0.5 rounded bg-orange-500/20 hover:bg-orange-500/40 text-orange-300 text-[9px] font-bold border border-orange-500/30">
                                                    + Pasang
                                                </button>
                                            @endif
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        <!-- Action Controls -->
                        <div class="space-y-2 pt-2 border-t border-white/5 text-xs">
                            
                            <!-- Upgrade Level Form -->
                            <form action="{{ route('player.team.upgrade', $n->id) }}" method="POST">
                                @csrf
                                <button type="submit" 
                                        {{ $isMaxLevel ? 'disabled' : '' }}
                                        class="w-full py-1.5 px-3 rounded-xl {{ $isMaxLevel ? 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/40 text-slate-300 hover:text-white' }} text-xs font-semibold flex items-center justify-between transition-all" 
                                        title="{{ $isMaxLevel ? 'Telah mencapai level maksimal 150' : 'Naikkan Level Shinobi' }}">
                                    <span class="flex items-center gap-1.5">
                                        <i class="fa-solid fa-arrow-up {{ $isMaxLevel ? 'text-slate-500' : 'text-amber-400' }} text-[10px]"></i> 
                                        {{ $isMaxLevel ? 'Level Maks (150)' : 'Upgrade Level' }}
                                    </span>
                                    @if(!$isMaxLevel)
                                        <span class="text-[10px] font-mono text-slate-400">
                                            <i class="fa-solid fa-coins text-slate-500"></i> {{ number_format($upgradeCost) }} Silver
                                        </span>
                                    @endif
                                </button>
                            </form>

                            <!-- Assignment Cluster -->
                            <div class="p-2.5 rounded-xl bg-black/60 border border-white/10 space-y-2">
                                
                                <!-- Lineup Tempur (Slot 1, 2, 3) -->
                                <div>
                                    <div class="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between mb-1">
                                        <span>⚔️ Pasang Tempur:</span>
                                        @if($n->isDeployed())
                                            <form action="{{ route('player.team.remove-slot', $n->id) }}" method="POST" class="inline">
                                                @csrf
                                                <button type="submit" class="text-red-400 hover:text-red-300 hover:underline text-[9px] font-bold">
                                                    Lepas Formasi
                                                </button>
                                            </form>
                                        @endif
                                    </div>
                                    <div class="grid grid-cols-3 gap-1">
                                        <form action="{{ route('player.team.assign-slot', [$n->id, 1]) }}" method="POST">
                                            @csrf
                                            <button type="submit" class="w-full py-1 rounded-lg text-[10px] font-black transition-all border {{ $combatSlot === 1 ? 'bg-amber-500 text-black border-amber-400 shadow-glow-gold/40' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-amber-500/20 hover:text-amber-300' }}">
                                                Slot 1
                                            </button>
                                        </form>

                                        <form action="{{ route('player.team.assign-slot', [$n->id, 2]) }}" method="POST">
                                            @csrf
                                            <button type="submit" class="w-full py-1 rounded-lg text-[10px] font-black transition-all border {{ $combatSlot === 2 ? 'bg-ninja-cyan text-black border-ninja-cyan shadow-glow-cyan/40' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-ninja-cyan/20 hover:text-ninja-cyan' }}">
                                                Slot 2
                                            </button>
                                        </form>

                                        <form action="{{ route('player.team.assign-slot', [$n->id, 3]) }}" method="POST">
                                            @csrf
                                            <button type="submit" class="w-full py-1 rounded-lg text-[10px] font-black transition-all border {{ $combatSlot === 3 ? 'bg-purple-500 text-white border-purple-400 shadow-lg' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-purple-500/20 hover:text-purple-300' }}">
                                                Slot 3
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                <!-- Deploy Board (Slot D1..D12) -->
                                <div class="pt-1.5 border-t border-white/5">
                                    <div class="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between mb-1">
                                        <span>🛡️ Papan Deploy (12 Slot):</span>
                                        @if($deploySlot > 0)
                                            <form action="{{ route('player.team.remove-deploy', $n->id) }}" method="POST" class="inline">
                                                @csrf
                                                <button type="submit" class="text-red-400 hover:text-red-300 hover:underline text-[9px] font-bold">
                                                    Lepas Deploy
                                                </button>
                                            </form>
                                        @endif
                                    </div>
                                    <form action="" method="POST" onsubmit="this.action='{{ url('player/team/' . $n->id . '/deploy') }}/' + this.target_slot.value" class="flex items-center gap-1.5">
                                        @csrf
                                        <select name="target_slot" class="flex-1 bg-black/80 border border-white/15 rounded-lg px-2 py-1 text-[10px] text-slate-200 focus:outline-none focus:border-emerald-500">
                                            @for($s = 1; $s <= 12; $s++)
                                                <option value="{{ $s }}" {{ $deploySlot === $s ? 'selected' : '' }}>
                                                    Slot D{{ $s }} {{ isset($deploySlots[$s]) && $deploySlots[$s]->id === $n->id ? '(Aktif)' : (isset($deploySlots[$s]) ? '(Ganti ' . $deploySlots[$s]->master->name . ')' : '(Kosong)') }}
                                                </option>
                                            @endfor
                                        </select>
                                        <button type="submit" class="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/60 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 transition-colors whitespace-nowrap">
                                            Pasang
                                        </button>
                                    </form>
                                </div>

                            </div>
                        </div>
                    </div>
                @endforeach
            </div>
        @endif
    </div>

</div>

<!-- MODAL EQUIP JUTSU -->
<div id="equipJutsuModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm hidden">
    <div class="glass-panel w-full max-w-lg border-2 border-amber-500/50 p-6 shadow-2xl relative max-h-[90vh] flex flex-col justify-between">
        <div>
            <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div>
                    <h3 id="modalNinjaTitle" class="font-title font-bold text-base text-white flex items-center gap-2">
                        <i class="fa-solid fa-scroll text-amber-400"></i> Pasang Jutsu
                    </h3>
                    <p id="modalSlotSubtitle" class="text-xs text-slate-400 mt-0.5">Pilih jutsu untuk dipasang.</p>
                </div>
                <button type="button" onclick="closeEquipModal()" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <!-- Jutsus Inventory List -->
            <div id="modalJutsuList" class="space-y-2 overflow-y-auto max-h-[50vh] pr-1">
                @if($playerJutsus->isEmpty())
                    <div class="p-8 text-center text-slate-400 text-xs">
                        <i class="fa-solid fa-scroll text-3xl opacity-30 mb-2"></i>
                        <p class="font-bold text-white mb-1">Belum Ada Gulungan Jutsu</p>
                        <p class="text-[11px] text-slate-500 mb-4">
                            Semua 4 slot jutsu bawaan kosong. Dapatkan jutsu baru melalui Gacha Ninjutsu School!
                        </p>
                        <button type="button" onclick="closeEquipModal(); openGachaJutsuModal();" class="btn-ninja-primary text-xs py-2 px-4">
                            Buka Gacha Jutsu Sekarang
                        </button>
                    </div>
                @else
                    @foreach($playerJutsus as $pj)
                        @php $jt = $pj->jutsu; @endphp
                        @if($jt)
                            <div class="p-2.5 rounded-xl bg-black/40 border border-white/10 hover:border-amber-500/40 transition-all flex items-center justify-between gap-3">
                                <div class="flex items-center gap-3 overflow-hidden">
                                    <div class="w-10 h-10 rounded-lg bg-black border border-white/10 overflow-hidden flex-shrink-0">
                                        <img src="{{ asset('images/skills/' . ($jt->icon ?? 'skill_001') . '.png') }}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='{{ asset('images/skills/skill_001.png') }}';">
                                    </div>
                                    <div class="overflow-hidden">
                                        <div class="flex items-center gap-1.5">
                                            <span class="px-1.5 py-0.2 rounded text-[9px] font-black badge-grade-{{ $jt->grade }}">
                                                {{ $jt->grade }}
                                            </span>
                                            <span class="font-bold text-white text-xs truncate">{{ $jt->name }}</span>
                                        </div>
                                        <div class="text-[10px] text-slate-400 truncate">{{ $jt->category }} • Dmg: {{ $jt->desc_dmg ?? '-' }}</div>
                                    </div>
                                </div>

                                <form id="modalEquipForm-{{ $jt->id }}" action="" method="POST" class="flex-shrink-0">
                                    @csrf
                                    <input type="hidden" name="slot_type" id="modalInputSlotType-{{ $jt->id }}" value="">
                                    <input type="hidden" name="jutsu_id" value="{{ $jt->id }}">
                                    <button type="submit" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all">
                                        Pasang
                                    </button>
                                </form>
                            </div>
                        @endif
                    @endforeach
                @endif
            </div>
        </div>

        <div class="pt-4 border-t border-white/10 flex items-center justify-between mt-4">
            <button type="button" onclick="closeEquipModal(); openGachaJutsuModal();" class="text-xs text-ninja-cyan hover:underline flex items-center gap-1.5">
                <i class="fa-solid fa-torii-gate"></i> Ingin jutsu baru? Kunjungi Gacha Jutsu
            </button>
            <button type="button" onclick="closeEquipModal()" class="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white">
                Tutup
            </button>
        </div>
    </div>
</div>

<!-- MODAL GACHA JUTSU (SEKOLAH NINJUTSU, SUMMON & BIJUU) -->
<div id="gachaJutsuModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md hidden">
    <div class="glass-panel w-full max-w-2xl border-2 border-ninja-cyan/60 p-6 sm:p-8 shadow-2xl relative max-h-[95vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
            <div>
                <h3 class="font-title font-black text-xl text-white flex items-center gap-2.5">
                    <span class="text-ninja-cyan">📜</span> SEKOLAH GULUNGAN JUTSU (GACHA JUTSU)
                </h3>
                <p class="text-xs text-slate-400 mt-1">
                    Dapatkan jutsu baru untuk dipasang ke 4 slot standar, slot VIP 3+, Summon, dan Bijuu.
                </p>
            </div>
            <button type="button" onclick="closeGachaJutsuModal()" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>

        <!-- Currency Display -->
        <div class="flex items-center justify-end gap-3 mb-6 p-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono font-bold">
            <span class="text-slate-300">
                <i class="fa-solid fa-coins text-slate-400"></i> <span id="gachaSilverBal">{{ number_format($user->silver) }}</span> Silver
            </span>
            <span class="text-amber-300">
                <i class="fa-solid fa-gem text-amber-400"></i> <span id="gachaGoldBal">{{ number_format($user->gold) }}</span> Gold
            </span>
        </div>

        <!-- 4 Gacha Jutsu Pools -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <!-- 1. Ninjutsu School (Basic Silver) -->
            <div class="p-4 rounded-2xl bg-black/40 border border-white/15 flex flex-col justify-between hover:border-slate-400 transition-all">
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-white/10 text-slate-300">
                            Ninjutsu School
                        </span>
                        <span class="text-[10px] font-mono text-slate-400">Grade D - S</span>
                    </div>
                    <h4 class="font-bold text-white text-sm mb-1">Sekolah Ninjutsu Dasar</h4>
                    <p class="text-xs text-slate-400 leading-relaxed mb-4">
                        Pelajari jurus dasar Ninjutsu, Taijutsu, dan Genjutsu untuk mengisi 4 slot skill default shinobi.
                    </p>
                </div>
                <button type="button" onclick="executeJutsuDraw('ninjutsu_silver')" class="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 flex items-center justify-center gap-2 transition-all">
                    <span>Tarik 1x</span>
                    <span class="text-slate-400 font-mono">(30,000 Silver)</span>
                </button>
            </div>

            <!-- 2. Advanced Ninjutsu (Gold) -->
            <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex flex-col justify-between hover:border-amber-400 transition-all shadow-glow-gold/10">
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-black">
                            Tingkat Tinggi
                        </span>
                        <span class="text-[10px] font-mono text-amber-300">Grade B - UR</span>
                    </div>
                    <h4 class="font-bold text-white text-sm mb-1">Gulungan Jutsu Rahasia</h4>
                    <p class="text-xs text-slate-300 leading-relaxed mb-4">
                        Peluang mendapatkan jutsu legendaris dan Kinjutsu terlarang tingkat tinggi dengan damage dahsyat.
                    </p>
                </div>
                <button type="button" onclick="executeJutsuDraw('ninjutsu_gold')" class="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-glow-gold flex items-center justify-center gap-2 transition-all">
                    <span>Tarik 1x</span>
                    <span class="font-mono">(50 Gold)</span>
                </button>
            </div>

            <!-- 3. Summon School (Kuchiyose) -->
            <div class="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex flex-col justify-between hover:border-cyan-400 transition-all shadow-glow-cyan/10">
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-cyan-500 text-black">
                            Summon School
                        </span>
                        <span class="text-[10px] font-mono text-cyan-300">Slot Kuchiyose</span>
                    </div>
                    <h4 class="font-bold text-white text-sm mb-1">Sekolah Kuchiyose</h4>
                    <p class="text-xs text-slate-300 leading-relaxed mb-4">
                        Ajaran khusus untuk memanggil hewan legendaris (Gamabunta, Manda, Katsuyu, dll) ke medan perang.
                    </p>
                </div>
                <button type="button" onclick="executeJutsuDraw('summon')" class="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs shadow-glow-cyan flex items-center justify-center gap-2 transition-all">
                    <span>Tarik 1x</span>
                    <span class="font-mono">(98 Gold)</span>
                </button>
            </div>

            <!-- 4. Tailed Beast Altar (Bijuu) -->
            <div class="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/40 flex flex-col justify-between hover:border-orange-400 transition-all shadow-glow-orange/10">
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-orange-500 text-black">
                            Altar Bijuu
                        </span>
                        <span class="text-[10px] font-mono text-orange-300">Slot Bijuu</span>
                    </div>
                    <h4 class="font-bold text-white text-sm mb-1">Altar Chakra Bijuu</h4>
                    <p class="text-xs text-slate-300 leading-relaxed mb-4">
                        Kumpulkan kekuatan Ekor 1 sampai Ekor 9 dan sematkan jurus Bijuu terkuat ke shinobi pilihan Anda.
                    </p>
                </div>
                <button type="button" onclick="executeJutsuDraw('biju')" class="w-full py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-black text-xs shadow-glow-orange flex items-center justify-center gap-2 transition-all">
                    <span>Tarik 1x</span>
                    <span class="font-mono">(298 Gold)</span>
                </button>
            </div>

        </div>

        <!-- Result Box (Hidden by default) -->
        <div id="gachaResultContainer" class="mt-6 p-4 rounded-2xl bg-black/80 border-2 border-emerald-500/50 hidden">
            <div class="text-center space-y-2">
                <span class="text-xs font-black uppercase tracking-wider text-emerald-400">✨ HASIL GACHA JUTSU ✨</span>
                <div class="w-16 h-16 mx-auto rounded-xl bg-black border-2 border-emerald-500 overflow-hidden shadow-lg">
                    <img id="resJutsuIcon" src="" class="w-full h-full object-cover">
                </div>
                <div class="flex items-center justify-center gap-2">
                    <span id="resJutsuGrade" class="px-2 py-0.2 rounded text-[10px] font-black"></span>
                    <h4 id="resJutsuName" class="font-black text-white text-base"></h4>
                </div>
                <p id="resJutsuDesc" class="text-xs text-slate-300 max-w-md mx-auto"></p>
                <div class="text-[11px] font-mono text-emerald-400 font-bold">
                    Jutsu telah ditambahkan ke koleksi dan siap dipasang ke shinobi!
                </div>
            </div>
        </div>
    </div>
</div>

<script>
    let currentNinjaId = null;
    let currentSlotType = null;

    function openEquipModal(ninjaId, slotType, slotName, ninjaName) {
        currentNinjaId = ninjaId;
        currentSlotType = slotType;

        document.getElementById('modalNinjaTitle').innerText = 'Pasang Jutsu: ' + ninjaName;
        document.getElementById('modalSlotSubtitle').innerText = 'Pilih jurus untuk dipasang pada ' + slotName;

        // Update all form actions and hidden slot_type
        const forms = document.querySelectorAll('[id^="modalEquipForm-"]');
        forms.forEach(form => {
            form.action = '{{ url("player/team") }}/' + ninjaId + '/equip-jutsu';
        });

        const inputs = document.querySelectorAll('[id^="modalInputSlotType-"]');
        inputs.forEach(input => {
            input.value = slotType;
        });

        document.getElementById('equipJutsuModal').classList.remove('hidden');
    }

    function closeEquipModal() {
        document.getElementById('equipJutsuModal').classList.add('hidden');
    }

    function openGachaJutsuModal() {
        document.getElementById('gachaJutsuModal').classList.remove('hidden');
    }

    function closeGachaJutsuModal() {
        document.getElementById('gachaJutsuModal').classList.add('hidden');
        document.getElementById('gachaResultContainer').classList.add('hidden');
    }

    async function executeJutsuDraw(type) {
        try {
            const res = await fetch('{{ route("player.gacha.draw-jutsu") }}', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': '{{ csrf_token() }}',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ type: type })
            });

            const data = await res.json();
            if (data.status === 'success') {
                const jutsu = data.data.jutsu;
                const currency = data.data.user_currency;

                document.getElementById('gachaSilverBal').innerText = Number(currency.silver).toLocaleString();
                document.getElementById('gachaGoldBal').innerText = Number(currency.gold).toLocaleString();

                document.getElementById('resJutsuIcon').src = '{{ asset("images/skills") }}/' + jutsu.icon + '.png';
                document.getElementById('resJutsuIcon').onerror = function() {
                    this.src = '{{ asset("images/skills/skill_001.png") }}';
                };
                document.getElementById('resJutsuName').innerText = jutsu.name;
                document.getElementById('resJutsuGrade').innerText = jutsu.grade + '-Rank';
                document.getElementById('resJutsuGrade').className = 'px-2 py-0.2 rounded text-[10px] font-black badge-grade-' + jutsu.grade;
                document.getElementById('resJutsuDesc').innerText = jutsu.description || (jutsu.category + ' • Dmg: ' + jutsu.damage);

                document.getElementById('gachaResultContainer').classList.remove('hidden');
            } else {
                alert('Gagal: ' + data.message);
            }
        } catch (e) {
            alert('Terjadi kesalahan jaringan saat Gacha Jutsu.');
        }
    }
</script>
@endsection
