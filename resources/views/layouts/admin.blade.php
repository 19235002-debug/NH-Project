<!DOCTYPE html>
<html lang="id" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Ninja Heroes - Game Master Console')</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    
    <!-- Fonts & Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Vite Assets -->
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-ninja">

    <!-- GM Top Navigation Bar -->
    <header class="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-amber-500/20 shadow-xl">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
                <!-- GM Brand -->
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 text-xl font-black shadow-glow-gold">
                        👑
                    </div>
                    <div>
                        <div class="font-title font-black text-lg tracking-wider text-amber-400 flex items-center gap-2">
                            GAME MASTER CONSOLE
                            <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">ROOT</span>
                        </div>
                        <div class="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                            Server Management & Emulator Core
                        </div>
                    </div>
                </div>

                <!-- Server Live Pulse & Switch to Player -->
                <div class="flex items-center gap-4">
                    <!-- Quick Switch to Player -->
                    <a href="{{ route('player.dashboard') }}" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-ninja-cyan/20 text-ninja-cyan border border-ninja-cyan/40 hover:bg-ninja-cyan hover:text-slate-950 font-bold text-xs tracking-wide transition-all shadow-glow-cyan/20">
                        <i class="fa-solid fa-gamepad"></i>
                        <span>Dunia Shinobi (Player)</span>
                    </a>

                    <!-- Current GM User -->
                    <div class="flex items-center gap-2 pl-3 border-l border-white/10">
                        <div class="text-right hidden sm:block">
                            <div class="text-xs font-bold text-white">{{ Auth::user()->username }}</div>
                            <div class="text-[10px] font-extrabold text-amber-400">ADMINISTRATOR</div>
                        </div>
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

        <!-- GM Navigation Tabs -->
        <nav class="bg-black/60 border-t border-white/5 px-4 overflow-x-auto">
            <div class="max-w-7xl mx-auto flex gap-1 sm:gap-2 py-2">
                <a href="{{ route('admin.dashboard') }}" class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 {{ request()->routeIs('admin.dashboard') ? 'bg-amber-500 text-slate-950 font-black shadow-glow-gold' : 'text-slate-400 hover:text-white hover:bg-white/5' }}">
                    <i class="fa-solid fa-gauge-high"></i> Dashboard
                </a>
                <a href="{{ route('admin.players') }}" class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 {{ request()->routeIs('admin.players*') ? 'bg-amber-500 text-slate-950 font-black shadow-glow-gold' : 'text-slate-400 hover:text-white hover:bg-white/5' }}">
                    <i class="fa-solid fa-users-gear"></i> Manajemen Pemain
                </a>
                <a href="{{ route('admin.notices') }}" class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 {{ request()->routeIs('admin.notices*') ? 'bg-amber-500 text-slate-950 font-black shadow-glow-gold' : 'text-slate-400 hover:text-white hover:bg-white/5' }}">
                    <i class="fa-solid fa-bullhorn"></i> Pengumuman Server
                </a>
                <a href="{{ route('admin.inspector') }}" class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 {{ request()->routeIs('admin.inspector*') ? 'bg-amber-500 text-slate-950 font-black shadow-glow-gold' : 'text-slate-400 hover:text-white hover:bg-white/5' }}">
                    <i class="fa-solid fa-network-wired"></i> Packet Inspector (APK)
                </a>
            </div>
        </nav>
    </header>

    <!-- Flash Alerts -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full">
        @if(session('success'))
            <div class="p-4 mb-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-3 backdrop-blur-md">
                <i class="fa-solid fa-circle-check text-emerald-400 text-base"></i>
                <span>{{ session('success') }}</span>
            </div>
        @endif
        @if(session('error'))
            <div class="p-4 mb-4 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-sm flex items-center gap-3 backdrop-blur-md">
                <i class="fa-solid fa-circle-exclamation text-red-400 text-base"></i>
                <span>{{ session('error') }}</span>
            </div>
        @endif
    </div>

    <!-- GM Main Content -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        @yield('content')
    </main>

    <!-- GM Footer -->
    <footer class="bg-black/60 border-t border-amber-500/10 py-5 text-center text-xs text-slate-500 mt-auto">
        <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
                <span class="text-amber-400 font-bold">Ninja Heroes GM Console</span> • Hak Akses Administrator
            </div>
            <div class="text-[11px] text-slate-600 font-mono">
                Port Websocket: 1763/8080 • Database: MySQL [ninja_heroes]
            </div>
        </div>
    </footer>

    @stack('scripts')
</body>
</html>
