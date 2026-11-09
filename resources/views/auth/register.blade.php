<!DOCTYPE html>
<html lang="id" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daftar Akun - Ninja Heroes Private Server</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-screen bg-ninja-dark text-slate-200 flex items-center justify-center p-4 font-ninja">

    <div class="w-full max-w-md">
        <!-- Brand Header -->
        <div class="text-center mb-6">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-ninja-orange to-amber-500 mx-auto flex items-center justify-center text-3xl shadow-glow-orange mb-3">
                🍥
            </div>
            <h1 class="font-title font-black text-2xl tracking-wider text-white">
                PENDAFTARAN SHINOBI
            </h1>
            <p class="text-xs uppercase tracking-widest text-ninja-orange font-bold mt-1">
                Bonus 50,000 Silver, 500 Gold & Starter Naruto
            </p>
        </div>

        <!-- Glass Register Card -->
        <div class="glass-panel p-6 sm:p-8">
            @if($errors->any())
                <div class="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs">
                    {{ $errors->first() }}
                </div>
            @endif

            <form action="{{ route('register') }}" method="POST" class="space-y-4">
                @csrf
                <div>
                    <label class="block text-xs font-bold text-slate-300 mb-1.5">Username Shinobi</label>
                    <input type="text" name="username" value="{{ old('username') }}" required autofocus
                        class="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-ninja-orange focus:ring-1 focus:ring-ninja-orange outline-none transition-all"
                        placeholder="e.g. sasuke_uchiha">
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-300 mb-1.5">Email (Opsional)</label>
                    <input type="email" name="email" value="{{ old('email') }}"
                        class="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-ninja-orange focus:ring-1 focus:ring-ninja-orange outline-none transition-all"
                        placeholder="shinobi@konoha.com">
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-300 mb-1.5">Password</label>
                    <input type="password" name="password" required
                        class="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-ninja-orange focus:ring-1 focus:ring-ninja-orange outline-none transition-all"
                        placeholder="••••••••">
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-300 mb-1.5">Konfirmasi Password</label>
                    <input type="password" name="password_confirmation" required
                        class="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-ninja-orange focus:ring-1 focus:ring-ninja-orange outline-none transition-all"
                        placeholder="••••••••">
                </div>

                <button type="submit" class="w-full btn-ninja-primary py-3">
                    <i class="fa-solid fa-user-plus"></i> Buat Akun & Mulai Petualangan
                </button>
            </form>

            <div class="mt-6 text-center text-xs text-slate-400">
                Sudah punya akun?
                <a href="{{ route('login') }}" class="text-ninja-cyan font-bold hover:underline ml-1">Masuk Sekarang</a>
            </div>
        </div>
    </div>

</body>
</html>
