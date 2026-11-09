<!DOCTYPE html>
<html lang="id" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Ninja Heroes Private Server</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-screen bg-ninja-dark text-slate-200 flex items-center justify-center p-4 font-ninja">

    <div class="w-full max-w-md">
        <!-- Brand Header -->
        <div class="text-center mb-8">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-ninja-orange to-amber-500 mx-auto flex items-center justify-center text-3xl shadow-glow-orange mb-4">
                🍥
            </div>
            <h1 class="font-title font-black text-2xl sm:text-3xl tracking-wider text-white">
                NINJA HEROES
            </h1>
            <p class="text-xs uppercase tracking-widest text-ninja-cyan font-bold mt-1">
                Server Emulation & Management Console
            </p>
        </div>

        <!-- Glass Login Card -->
        <div class="glass-panel p-6 sm:p-8">
            <!-- Quick Role Select Cards -->
            <div class="mb-6 space-y-3">
                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pilih Mode Akses Cepat:</div>
                
                <!-- GM Card -->
                <a href="{{ route('quick.switch', 'admin') }}" class="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-600/10 border border-amber-500/40 hover:border-amber-400 hover:scale-[1.01] transition-all group shadow-sm">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-base font-black shadow-glow-gold/30">
                            👑
                        </div>
                        <div>
                            <div class="text-xs font-bold text-amber-300 group-hover:text-amber-200">Mode Game Master (GM)</div>
                            <div class="text-[11px] text-slate-400">Akun: <strong>admin</strong> • Kontrol Penuh Server</div>
                        </div>
                    </div>
                    <span class="text-xs font-extrabold text-amber-400 px-3 py-1 rounded-lg bg-amber-500/20 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                        Masuk GM
                    </span>
                </a>

                <!-- Player Card -->
                <a href="{{ route('quick.switch', 'player') }}" class="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-ninja-cyan/15 to-blue-600/10 border border-ninja-cyan/40 hover:border-ninja-cyan hover:scale-[1.01] transition-all group shadow-sm">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-lg bg-ninja-cyan/20 text-ninja-cyan flex items-center justify-center text-base font-black shadow-glow-cyan/30">
                            ⚡
                        </div>
                        <div>
                            <div class="text-xs font-bold text-cyan-300 group-hover:text-cyan-200">Mode Player Shinobi</div>
                            <div class="text-[11px] text-slate-400">Gacha Hut, Team, Combine & Exam</div>
                        </div>
                    </div>
                    <span class="text-xs font-extrabold text-ninja-cyan px-3 py-1 rounded-lg bg-ninja-cyan/20 group-hover:bg-ninja-cyan group-hover:text-black transition-colors">
                        Masuk Player
                    </span>
                </a>
            </div>

            <!-- Divider -->
            <div class="relative my-6 text-center">
                <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-white/10"></div></div>
                <span class="relative bg-ninja-card px-3 text-[11px] uppercase tracking-wider text-slate-500 font-bold">Atau Login Manual</span>
            </div>

            <!-- Error message -->
            @if($errors->any())
                <div class="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs">
                    {{ $errors->first() }}
                </div>
            @endif

            <!-- Form -->
            <form action="{{ route('login') }}" method="POST" class="space-y-4">
                @csrf
                <div>
                    <label class="block text-xs font-bold text-slate-300 mb-1.5">Username / Email</label>
                    <input type="text" name="username" value="{{ old('username') }}" required autofocus
                        class="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-ninja-orange focus:ring-1 focus:ring-ninja-orange outline-none transition-all"
                        placeholder="e.g. naruto atau admin">
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-300 mb-1.5">Password</label>
                    <input type="password" name="password" required
                        class="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-ninja-orange focus:ring-1 focus:ring-ninja-orange outline-none transition-all"
                        placeholder="••••••••">
                </div>

                <div class="flex items-center justify-between text-xs text-slate-400">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="remember" class="rounded bg-black/50 border-white/20 text-ninja-orange focus:ring-0">
                        <span>Ingat Sesi Saya</span>
                    </label>
                </div>

                <button type="submit" class="w-full btn-ninja-primary py-3">
                    <i class="fa-solid fa-right-to-bracket"></i> Masuk Sekarang
                </button>
            </form>

            <div class="mt-6 text-center text-xs text-slate-400">
                Belum punya akun shinobi?
                <a href="{{ route('register') }}" class="text-ninja-cyan font-bold hover:underline ml-1">Daftar Akun Baru</a>
            </div>
        </div>
    </div>

</body>
</html>
