@extends('layouts.player')

@section('title', 'Authentic Shinobi Codex - Ninja Heroes')

@section('content')
<div class="space-y-6">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="font-title font-black text-2xl sm:text-3xl text-white tracking-wide">
                📖 AUTHENTIC SHINOBI CODEX
            </h1>
            <p class="text-xs sm:text-sm text-slate-400 mt-1">
                Katalog master resmi 220 Shinobi dan Jutsu yang diekstrak langsung dari Role.js client game.
            </p>
        </div>
        <!-- Stats Badges -->
        <div class="flex items-center gap-2">
            <span class="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold text-slate-300">
                <i class="fa-solid fa-users text-ninja-orange mr-1"></i> {{ $stats['total_ninjas'] }} Shinobi
            </span>
            <span class="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold text-slate-300">
                <i class="fa-solid fa-wand-magic-sparkles text-ninja-cyan mr-1"></i> {{ $stats['total_jutsus'] }} Jutsu
            </span>
        </div>
    </div>

    <!-- Filter Bar -->
    <div class="glass-panel p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <!-- Category Toggle -->
        <div class="inline-flex p-1 rounded-xl bg-black/40 border border-white/10 w-full sm:w-auto">
            <a href="{{ route('player.codex', ['cat' => 'ninjas', 'grade' => $selectedGrade, 'q' => $search]) }}" class="px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 {{ $category === 'ninjas' ? 'bg-ninja-orange text-white shadow-glow-orange' : 'text-slate-400 hover:text-white' }}">
                <i class="fa-solid fa-user-ninja"></i> Shinobi Roster
            </a>
            <a href="{{ route('player.codex', ['cat' => 'jutsus', 'grade' => $selectedGrade, 'q' => $search]) }}" class="px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 {{ $category === 'jutsus' ? 'bg-ninja-cyan text-white shadow-glow-cyan' : 'text-slate-400 hover:text-white' }}">
                <i class="fa-solid fa-wand-magic-sparkles"></i> Master Jutsu
            </a>
        </div>

        <!-- Grade Filter Chips -->
        <div class="flex flex-wrap items-center gap-1.5 overflow-x-auto w-full md:w-auto justify-center">
            <a href="{{ route('player.codex', ['cat' => $category, 'grade' => '', 'q' => $search]) }}" class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all {{ empty($selectedGrade) ? 'bg-white text-slate-950 font-black' : 'bg-white/5 text-slate-400 hover:text-white' }}">
                ALL
            </a>
            @foreach(['UR', 'SSS', 'SS', 'S', 'A', 'B', 'C', 'D'] as $g)
                <a href="{{ route('player.codex', ['cat' => $category, 'grade' => $g, 'q' => $search]) }}" class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all {{ $selectedGrade === $g ? 'bg-ninja-orange text-white' : 'bg-white/5 text-slate-400 hover:text-white' }}">
                    {{ $g }}
                </a>
            @endforeach
        </div>

        <!-- Search Form -->
        <form action="{{ route('player.codex') }}" method="GET" class="w-full md:w-64">
            <input type="hidden" name="cat" value="{{ $category }}">
            <input type="hidden" name="grade" value="{{ $selectedGrade }}">
            <div class="relative">
                <input type="text" name="q" value="{{ $search }}" placeholder="Cari nama shinobi..." class="w-full pl-8 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:border-ninja-orange outline-none">
                <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-xs text-slate-500"></i>
            </div>
        </form>
    </div>

    <!-- Content: Ninjas Catalog -->
    @if($category === 'ninjas')
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            @forelse($ninjas as $n)
                <div class="glass-panel p-4 flex flex-col justify-between border-2 ninja-card-{{ $n->grade }} transition-all group">
                    <div>
                        <div class="flex items-center gap-3 mb-3">
                            <div class="w-14 h-14 rounded-xl ninja-frame-{{ $n->grade }} bg-black overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform shadow-md">
                                <img src="{{ asset('images/ninja_heads/' . ($n->xmlfile ?? 'mingren') . '_h.png') }}" alt="" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='{{ asset('images/ninja_heads/mingren_h.png') }}';">
                            </div>
                            <div>
                                <span class="inline-block px-1.5 py-0.2 rounded text-[9px] font-black badge-grade-{{ $n->grade }}">
                                    GRADE {{ $n->grade }}
                                </span>
                                <h3 class="font-bold text-white text-sm mt-0.5 leading-tight">{{ $n->name }}</h3>
                                <div class="text-[10px] text-ninja-cyan">Element: [{{ $n->element ?: 'Neutral' }}]</div>
                            </div>
                        </div>

                        <!-- Stats -->
                        <div class="grid grid-cols-2 gap-1 p-2 rounded-xl bg-black/40 border border-white/5 font-mono text-[10px] mb-3">
                            <div class="text-slate-400">ATK: <strong class="text-white">{{ number_format($n->base_atk) }}</strong></div>
                            <div class="text-slate-400">DEF: <strong class="text-white">{{ number_format($n->base_def) }}</strong></div>
                            <div class="text-slate-400">HP: <strong class="text-white">{{ number_format($n->base_hp) }}</strong></div>
                            <div class="text-slate-400">AGI: <strong class="text-white">{{ number_format($n->base_speed) }}</strong></div>
                        </div>

                        <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {{ $n->description ?: 'Shinobi otentik resmi dari master Role.js in-game.' }}
                        </p>
                    </div>

                    <div class="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>Tier Quality: {{ $n->quality }}</span>
                        <span>Sprite: {{ $n->xmlfile }}</span>
                    </div>
                </div>
            @empty
                <div class="col-span-full glass-panel p-8 text-center text-slate-400 text-xs">
                    Tidak ditemukan shinobi yang cocok dengan pencarian.
                </div>
            @endforelse
        </div>

        <div class="mt-6">
            {{ $ninjas->links() }}
        </div>
    @else
        <!-- Jutsus Catalog -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            @forelse($jutsus as $j)
                <div class="glass-panel p-4 flex flex-col justify-between border border-white/10 hover:border-ninja-cyan/40 transition-all group">
                    <div>
                        <div class="flex items-center gap-3 mb-3">
                            <div class="w-12 h-12 rounded-xl border border-white/20 bg-black overflow-hidden flex-shrink-0">
                                <img src="{{ asset('images/skills/' . ($j->icon ?? 'skill_001') . '.png') }}" alt="" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='{{ asset('images/skills/skill_001.png') }}';">
                            </div>
                            <div>
                                <span class="inline-block px-1.5 py-0.2 rounded text-[9px] font-black badge-grade-{{ $j->grade }}">
                                    GRADE {{ $j->grade }}
                                </span>
                                <h3 class="font-bold text-white text-sm mt-0.5 leading-tight">{{ $j->name }}</h3>
                                <div class="text-[10px] text-amber-400">{{ $j->category ?: 'Ninjutsu' }}</div>
                            </div>
                        </div>

                        <p class="text-[11px] text-slate-300 line-clamp-3 leading-relaxed mb-3">
                            {{ $j->description ?: 'Jutsu tempur legendaris.' }}
                        </p>
                    </div>

                    <div class="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>Peluang: {{ $j->probability ?? 100 }}%</span>
                        <span>ID: {{ $j->id }}</span>
                    </div>
                </div>
            @empty
                <div class="col-span-full glass-panel p-8 text-center text-slate-400 text-xs">
                    Tidak ditemukan jutsu yang cocok dengan pencarian.
                </div>
            @endforelse
        </div>

        <div class="mt-6">
            {{ $jutsus->links() }}
        </div>
    @endif

</div>
@endsection
