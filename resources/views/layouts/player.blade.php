<!DOCTYPE html>
<html lang="id" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Ninja Heroes - Portal Shinobi')</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    
    <!-- Fonts & Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Vite Assets -->
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-screen bg-ninja-dark text-slate-200 flex flex-col font-ninja">

    <!-- Top Navigation Bar -->
    <header class="sticky top-0 z-50 bg-ninja-card/90 backdrop-blur-md border-b border-white/10 shadow-lg">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
                <!-- Brand -->
                <a href="{{ route('player.dashboard') }}" class="flex items-center gap-3 group">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-ninja-orange to-amber-500 flex items-center justify-center text-xl shadow-glow-orange group-hover:scale-105 transition-transform">
                        🍥
                    </div>
                    <div>
                        <div class="font-title font-black text-lg tracking-wider text-white group-hover:text-ninja-orange transition-colors">
                            NINJA HEROES
                        </div>
                        <div class="text-[10px] uppercase font-bold tracking-widest text-ninja-cyan">
                            Shinobi Portal
                        </div>
                    </div>
                </a>

                <!-- Currencies & Stats Bar -->
                <div class="hidden md:flex items-center gap-3">
                    <!-- Stamina + Ramen -->
                    <div class="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold gap-2 shadow-sm">
                        <i class="fa-solid fa-bolt text-amber-400"></i>
                        <span>{{ Auth::user()->stamina ?? 100 }}/150</span>
                        <form action="{{ route('player.ramen') }}" method="POST" class="inline">
                            @csrf
                            <button type="submit" class="ml-1 px-2 py-0.5 rounded-lg bg-ninja-orange/20 text-ninja-orange border border-ninja-orange/40 hover:bg-ninja-orange hover:text-white transition-all text-[11px] font-bold" title="Klaim Ramen Ichiraku (+50 Stamina)">
                                🍜 Ramen
                            </button>
                        </form>
                    </div>

                    <!-- Silver -->
                    <div class="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold gap-2">
                        <i class="fa-solid fa-coins text-slate-300"></i>
                        <span class="text-slate-100 font-mono">{{ number_format(Auth::user()->silver ?? 0) }}</span>
                    </div>

                    <!-- Gold -->
                    <div class="flex items-center bg-white/5 border border-amber-500/30 rounded-xl px-3 py-1.5 text-xs font-semibold gap-2 shadow-glow-gold/10">
                        <i class="fa-solid fa-gem text-amber-400"></i>
                        <span class="text-amber-300 font-mono font-bold">{{ number_format(Auth::user()->gold ?? 0) }}</span>
                    </div>

                    <!-- Main Ninja Avatar -->
                    @if(Auth::user()->mainNinja && Auth::user()->mainNinja->master)
                        @php $mn = Auth::user()->mainNinja->master; @endphp
                        <div class="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1">
                            <div class="w-7 h-7 rounded-lg overflow-hidden ninja-frame-{{ $mn->grade }} bg-black flex-shrink-0">
                                <img src="{{ asset('images/ninja_heads/' . ($mn->xmlfile ?? 'mingren') . '_h.png') }}" alt="{{ $mn->name }}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='{{ asset('images/ninja_heads/mingren_h.png') }}';">
                            </div>
                            <div class="text-[11px]">
                                <div class="font-bold text-white leading-tight truncate max-w-[90px]">{{ $mn->name }}</div>
                                <span class="text-[9px] font-extrabold text-ninja-orange">Lv.{{ Auth::user()->mainNinja->level }}</span>
                            </div>
                        </div>
                    @endif
                </div>

                <!-- User & Mode Switcher Menu -->
                <div class="flex items-center gap-3">
                    @if(Auth::user()->isAdmin())
                        <a href="{{ route('admin.dashboard') }}" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500 hover:text-black font-bold text-xs tracking-wide transition-all shadow-glow-gold/20">
                            <i class="fa-solid fa-crown text-amber-400"></i>
                            <span class="hidden sm:inline">Mode GM</span>
                        </a>
                    @else
                        <a href="{{ route('quick.switch', 'admin') }}" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-amber-400 font-medium text-xs transition-all" title="Beralih cepat ke Akun GM">
                            <i class="fa-solid fa-crown text-xs"></i>
                            <span class="hidden sm:inline">Beralih ke GM</span>
                        </a>
                    @endif

                    <div class="flex items-center gap-2 pl-2 border-l border-white/10">
                        <span class="text-xs font-bold text-white hidden sm:inline">{{ Auth::user()->username }}</span>
                        <form action="{{ route('logout') }}" method="POST" class="inline">
                            @csrf
                            <button type="submit" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-white/10 flex items-center justify-center text-xs text-slate-400 transition-colors" title="Logout">
                                <i class="fa-solid fa-arrow-right-from-bracket"></i>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- Navigation Tabs -->
        <nav class="bg-black/40 border-t border-white/5 px-4 overflow-x-auto">
            <div class="max-w-7xl mx-auto flex gap-1 sm:gap-2 py-2">
                <a href="{{ route('player.dashboard') }}" class="px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 {{ request()->routeIs('player.dashboard') ? 'bg-ninja-orange text-white shadow-glow-orange' : 'text-slate-400 hover:text-white hover:bg-white/5' }}">
                    <i class="fa-solid fa-house"></i> Home
                </a>
                <a href="{{ route('player.gacha') }}" class="px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 {{ request()->routeIs('player.gacha*') ? 'bg-ninja-orange text-white shadow-glow-orange' : 'text-slate-400 hover:text-white hover:bg-white/5' }}">
                    <i class="fa-solid fa-torii-gate"></i> Ninja Hut & Crane
                </a>
                <a href="{{ route('player.team') }}" class="px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 {{ request()->routeIs('player.team*') ? 'bg-ninja-orange text-white shadow-glow-orange' : 'text-slate-400 hover:text-white hover:bg-white/5' }}">
                    <i class="fa-solid fa-users"></i> Shinobi Team
                </a>
                <a href="{{ route('player.combine') }}" class="px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 {{ request()->routeIs('player.combine*') ? 'bg-ninja-orange text-white shadow-glow-orange' : 'text-slate-400 hover:text-white hover:bg-white/5' }}">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Combine
                </a>
                <a href="{{ route('player.arena') }}" class="px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 {{ request()->routeIs('player.arena*') ? 'bg-ninja-orange text-white shadow-glow-orange' : 'text-slate-400 hover:text-white hover:bg-white/5' }}">
                    <i class="fa-solid fa-khanda"></i> Exam & Arena
                </a>
                <a href="{{ route('player.codex') }}" class="px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 {{ request()->routeIs('player.codex*') ? 'bg-ninja-orange text-white shadow-glow-orange' : 'text-slate-400 hover:text-white hover:bg-white/5' }}">
                    <i class="fa-solid fa-book-journal-whills"></i> Codex
                </a>
                <a href="{{ route('player.apk') }}" class="px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 {{ request()->routeIs('player.apk*') ? 'bg-ninja-orange text-white shadow-glow-orange' : 'text-slate-400 hover:text-white hover:bg-white/5' }}">
                    <i class="fa-solid fa-mobile-screen-button"></i> Download APK
                </a>
                @if(Auth::user()->isAdmin())
                    <a href="{{ route('admin.dashboard') }}" class="px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 ml-auto border border-amber-500/30">
                        <i class="fa-solid fa-crown text-amber-400"></i> GM Console
                    </a>
                @endif
            </div>
        </nav>
    </header>

    <!-- Global Notice Gold Reminder (if visiting other tabs and unclaimed) -->
    @if(!request()->routeIs('player.dashboard') && isset($globalNotice) && $globalNotice && $globalNotice->reward_gold > 0 && empty($hasClaimedGlobalNotice))
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3 w-full">
            <a href="{{ route('player.dashboard') }}" class="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-black/40 to-amber-500/10 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between gap-3 hover:border-amber-400 transition-all shadow-glow-gold/10 group">
                <div class="flex items-center gap-2.5 truncate">
                    <span class="px-2 py-0.5 rounded bg-amber-500/30 text-amber-200 font-black text-[10px] animate-pulse whitespace-nowrap">🎁 HADIAH GOLD AKTIF</span>
                    <span class="font-bold text-white group-hover:text-amber-300 transition-colors truncate">{{ $globalNotice->title }}</span>
                    <span class="text-slate-400 hidden sm:inline">• +{{ number_format($globalNotice->reward_gold) }} Gold tersedia untuk diklaim!</span>
                </div>
                <span class="text-[11px] font-black text-amber-400 flex items-center gap-1 whitespace-nowrap">
                    Klaim di Home <i class="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
                </span>
            </a>
        </div>
    @endif

    <!-- Flash Alert Notifications -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full">
        @if(session('success'))
            <div class="p-4 mb-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-3 backdrop-blur-md animate-fade-in">
                <i class="fa-solid fa-circle-check text-emerald-400 text-base"></i>
                <span>{{ session('success') }}</span>
            </div>
        @endif
        @if(session('error'))
            <div class="p-4 mb-4 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-sm flex items-center gap-3 backdrop-blur-md animate-fade-in">
                <i class="fa-solid fa-circle-exclamation text-red-400 text-base"></i>
                <span>{{ session('error') }}</span>
            </div>
        @endif
        @if(session('info'))
            <div class="p-4 mb-4 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-300 text-sm flex items-center gap-3 backdrop-blur-md animate-fade-in">
                <i class="fa-solid fa-circle-info text-sky-400 text-base"></i>
                <span>{{ session('info') }}</span>
            </div>
        @endif
    </div>

    <!-- Main Content Slot -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        @yield('content')
    </main>

    <!-- Footer -->
    <footer class="bg-black/50 border-t border-white/5 py-6 text-center text-xs text-slate-500 mt-auto">
        <div class="max-w-7xl mx-auto px-4">
            <p>Ninja Heroes Server Emulation Core • Built with Laravel 10 & Tailwind CSS v3.4</p>
            <p class="text-[11px] text-slate-600 mt-1">100% Synchronized with In-Game APK Client WebSocket Engine</p>
        </div>
    </footer>

    @stack('scripts')
</body>
</html>
