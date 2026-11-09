@extends('layouts.player')

@section('title', 'Ninja Hut & Crane Gacha - Ninja Heroes')

@section('content')
<div class="space-y-6">

    <!-- Section Header -->
    <div class="text-center max-w-2xl mx-auto">
        <h1 class="font-title font-black text-3xl sm:text-4xl text-white tracking-wide">
            🏮 REKRUTMEN SHINOBI
        </h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-2">
            Sistem gacha 100% otentik sinkron dengan in-game client (Building.js, Catchninja.js & master database).
        </p>
    </div>

    <!-- Authentic UR Guarantee Pity Tracker Card -->
    <div class="glass-panel p-6 border-2 border-amber-500/40 relative overflow-hidden shadow-glow-gold/15">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div class="flex items-center gap-3.5">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center text-2xl font-black shadow-glow-gold">
                    👑
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <span class="font-title font-black text-lg text-white">JAMINAN REKRUTMEN UR</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-black bg-pink-500/20 text-pink-400 border border-pink-500/40 shadow-glow-ur/30">100% GARANSI</span>
                    </div>
                    <p class="text-xs text-slate-400 mt-0.5">
                        Tarik 50 Advanced atau 5x Special Combo untuk mengklaim 1 Shinobi Kelas UR Acak!
                    </p>
                </div>
            </div>

            <div class="text-right flex-shrink-0">
                <div class="text-2xl font-mono font-black text-amber-400">
                    <span id="pityCurrentNum">{{ $gachaInfo['pity']['current'] }}</span> / 50
                </div>
                <div class="text-[11px] text-slate-400 font-semibold">Tarikan Terkumpul</div>
            </div>
        </div>

        <!-- Progress Bar Track -->
        @php 
            $pct = min(100, round(($gachaInfo['pity']['current'] / 50) * 100));
        @endphp
        <div class="w-full h-3.5 bg-black/60 rounded-full p-0.5 border border-white/10 overflow-hidden mb-3">
            <div id="pityProgressBar" class="h-full rounded-full bg-gradient-to-r from-amber-500 via-ninja-orange to-pink-500 transition-all duration-500 {{ $pct >= 100 ? 'shadow-glow-gold' : '' }}" style="width: {{ $pct }}%;"></div>
        </div>

        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400">
            <div class="flex items-center gap-2">
                <i class="fa-solid fa-fire text-red-500"></i>
                <span>Tersisa <strong id="pityRemainingCount" class="text-amber-400 font-mono">{{ $gachaInfo['pity']['remaining'] }}</strong> tarikan menuju Jaminan Grade UR!</span>
            </div>
            <span class="text-slate-500 text-[11px]">
                Advanced (+1) • Special 10-Combo (+10)
            </span>
        </div>
    </div>

    <!-- Gacha Banner Switcher (Building 1 vs Building 17) -->
    <div class="flex justify-center">
        <div class="inline-flex p-1.5 rounded-2xl bg-black/40 border border-white/10 gap-2">
            <button id="btnTabHut" onclick="switchBanner('hut')" class="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 bg-ninja-orange text-white shadow-glow-orange">
                <i class="fa-solid fa-torii-gate"></i> Gedung 1: Ninja Hut
            </button>
            <button id="btnTabCrane" onclick="switchBanner('crane')" class="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 text-slate-400 hover:text-white hover:bg-white/5">
                <i class="fa-solid fa-gamepad"></i> Gedung 17: Special Claw Crane
            </button>
        </div>
    </div>

    <!-- BANNER 1: NINJA HUT (GEDUNG 1) -->
    <div id="bannerHutContainer" class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- 1. Basic Capture -->
        <div class="glass-panel p-6 flex flex-col justify-between border-blue-500/30 hover:border-blue-400 transition-all relative group">
            <span class="absolute top-3 right-3 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40">
                CLASS D – S
            </span>

            <div>
                <div class="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center text-3xl mb-4 group-hover:scale-105 transition-transform">
                    📜
                </div>
                <h3 class="font-title font-black text-xl text-blue-400 mb-2">Basic Capture</h3>
                <p class="text-xs text-slate-400 leading-relaxed mb-4">
                    Gunakan jebakan gulungan ninja dasar. Ninja Genin dan Chunin (B, C, D) mudah ditangkap. Ninja Class A & S sangat langka.
                </p>

                <!-- Rate chips -->
                <div class="flex flex-wrap gap-1.5 mb-6 text-[11px] font-mono">
                    <span class="px-2 py-0.5 rounded bg-slate-500/20 text-slate-400 border border-slate-500/30">D: 55%</span>
                    <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">C: 35%</span>
                    <span class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">B: 8.5%</span>
                    <span class="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">A: 1.4%</span>
                    <span class="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">S: 0.1%</span>
                </div>
            </div>

            <div>
                <div class="flex items-center justify-center gap-2 py-2 mb-4 rounded-xl bg-white/5 border border-white/5 text-slate-200 font-mono font-bold text-sm">
                    <i class="fa-solid fa-coins text-slate-300"></i> 30,000 Silver
                </div>
                <div class="flex gap-2">
                    <button id="btn-basic" onclick="drawGacha('basic')" class="flex-1 btn-ninja-secondary py-2.5">
                        <i class="fa-solid fa-dice"></i> Tangkap (1x)
                    </button>
                    <button onclick="openRatesModal('basic')" class="btn-ninja-secondary px-3.5" title="Lihat Probabilitas & Roster">
                        <i class="fa-solid fa-list-check"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- 2. Advanced Capture -->
        <div class="glass-panel p-6 flex flex-col justify-between border-purple-500/30 hover:border-purple-400 transition-all relative group">
            <span class="absolute top-3 right-3 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                CLASS B – UR • +1 PITY
            </span>

            <div>
                <div class="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center text-3xl mb-4 group-hover:scale-105 transition-transform">
                    🔮
                </div>
                <h3 class="font-title font-black text-xl text-purple-400 mb-2">Advanced Capture</h3>
                <p class="text-xs text-slate-400 leading-relaxed mb-4">
                    Menggunakan grappler canggih chakra. Berkesempatan menangkap Shinobi Kelas B, A, S, SS, SSS, dan Dewa UR!
                </p>

                <!-- Rate chips -->
                <div class="flex flex-wrap gap-1.5 mb-6 text-[11px] font-mono">
                    <span class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">B: 55%</span>
                    <span class="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">A: 32%</span>
                    <span class="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">S: 9%</span>
                    <span class="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">SS: 3%</span>
                    <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">SSS: 0.8%</span>
                    <span class="px-2 py-0.5 rounded bg-pink-500/20 text-pink-400 border border-pink-500/30 font-bold">UR: 0.2%</span>
                </div>
            </div>

            <div>
                <div class="flex items-center justify-center gap-2 py-2 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono font-bold text-sm">
                    <i class="fa-solid fa-gem text-amber-400"></i> 298 Gold
                </div>
                <div class="flex gap-2">
                    <button id="btn-advanced" onclick="drawGacha('advanced')" class="flex-1 btn-ninja-cyan py-2.5">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Tangkap (1x)
                    </button>
                    <button onclick="openRatesModal('advanced')" class="btn-ninja-secondary px-3.5" title="Lihat Probabilitas & Roster">
                        <i class="fa-solid fa-list-check"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- 3. Special 10-Combo Capture -->
        <div class="glass-panel p-6 flex flex-col justify-between border-ninja-orange/40 hover:border-ninja-orange transition-all relative group shadow-glow-orange/20">
            <span class="absolute top-3 right-3 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-glow-orange/40">
                🔥 10x COMBO • GARANSI GRADE A+
            </span>

            <div>
                <div class="w-14 h-14 rounded-2xl bg-ninja-orange/20 text-ninja-orange border border-ninja-orange/30 flex items-center justify-center text-3xl mb-4 group-hover:scale-105 transition-transform shadow-glow-orange/30">
                    🔥
                </div>
                <h3 class="font-title font-black text-xl text-ninja-orange mb-2">Special 10-Combo</h3>
                <p class="text-xs text-slate-400 leading-relaxed mb-4">
                    Tarik 10 shinobi sekaligus. <strong>Pasti menangkap minimal 1 Ninja Class-A atau lebih tinggi di slot 10!</strong> Memberikan +10 Progres Pity UR!
                </p>

                <!-- Guarantee chip -->
                <div class="p-2.5 rounded-xl bg-ninja-orange/15 border border-ninja-orange/30 text-xs text-amber-300 font-semibold mb-6 flex items-center gap-2">
                    <i class="fa-solid fa-crown text-amber-400"></i>
                    <span>Slot 10: 100% Garansi Class A / S / SS / SSS / UR</span>
                </div>
            </div>

            <div>
                <div class="flex items-center justify-center gap-2 py-2 mb-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold text-base shadow-glow-gold/10">
                    <i class="fa-solid fa-gem text-amber-400"></i> 2,980 Gold
                </div>
                <div class="flex gap-2">
                    <button id="btn-special" onclick="drawGacha('special')" class="flex-1 btn-ninja-primary py-2.5 font-black">
                        <i class="fa-solid fa-fire"></i> Tangkap 10x Spesial
                    </button>
                    <button onclick="openRatesModal('special')" class="btn-ninja-secondary px-3.5" title="Lihat Probabilitas & Roster">
                        <i class="fa-solid fa-list-check"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- BANNER 2: SPECIAL CLAW CRANE (GEDUNG 17) -->
    <div id="bannerCraneContainer" class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto hidden">
        <!-- Crane 1x -->
        <div class="glass-panel p-6 flex flex-col justify-between border-amber-500/40 hover:border-amber-400 transition-all relative group">
            <span class="absolute top-3 right-3 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ELITE CRANE: S – UR
            </span>

            <div>
                <div class="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center text-3xl mb-4 group-hover:scale-105 transition-transform shadow-glow-gold/20">
                    🕹️
                </div>
                <h3 class="font-title font-black text-xl text-amber-400 mb-2">Special Crane (1x)</h3>
                <p class="text-xs text-slate-400 leading-relaxed mb-4">
                    Mesin capit otentik Gedung 17 (Catchninja.js). Bebas dari ninja kelas bawah (D/C/B)! Khusus shinobi elit Grade S, SS, SSS, dan UR.
                </p>

                <!-- Rate chips -->
                <div class="flex flex-wrap gap-1.5 mb-6 text-[11px] font-mono">
                    <span class="px-2.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">S: 88.4%</span>
                    <span class="px-2.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">SS: 9.0%</span>
                    <span class="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">SSS: 2.0%</span>
                    <span class="px-2.5 py-0.5 rounded bg-pink-500/20 text-pink-400 border border-pink-500/30 font-bold">UR: 0.6%</span>
                </div>
            </div>

            <div>
                <div class="flex items-center justify-center gap-2 py-2 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono font-bold text-sm">
                    <i class="fa-solid fa-gem text-amber-400"></i> 298 Gold
                </div>
                <div class="flex gap-2">
                    <button id="btn-crane" onclick="drawGacha('crane')" class="flex-1 btn-ninja-cyan py-2.5">
                        <i class="fa-solid fa-gamepad"></i> Capit Ninja (1x)
                    </button>
                    <button onclick="openRatesModal('crane')" class="btn-ninja-secondary px-3.5" title="Lihat Probabilitas & Roster">
                        <i class="fa-solid fa-list-check"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Crane 10x -->
        <div class="glass-panel p-6 flex flex-col justify-between border-pink-500/40 hover:border-pink-400 transition-all relative group shadow-glow-ur/20">
            <span class="absolute top-3 right-3 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-amber-500 text-white shadow-glow-ur/30">
                🎰 10x CAPIT ELITE • UR PELUANG TINGGI
            </span>

            <div>
                <div class="w-14 h-14 rounded-2xl bg-pink-500/15 text-pink-400 border border-pink-500/30 flex items-center justify-center text-3xl mb-4 group-hover:scale-105 transition-transform shadow-glow-ur/30">
                    ✨
                </div>
                <h3 class="font-title font-black text-xl text-pink-400 mb-2">Special Crane (10x)</h3>
                <p class="text-xs text-slate-400 leading-relaxed mb-4">
                    Tarik 10 ninja sekaligus dari capit legendaris. Peluang tertinggi untuk merekrut shinobi Kelas S, SS, SSS, dan UR secara massal!
                </p>

                <!-- Rate chip -->
                <div class="p-2.5 rounded-xl bg-pink-500/15 border border-pink-500/30 text-xs text-pink-300 font-semibold mb-6 flex items-center gap-2">
                    <i class="fa-solid fa-gem text-pink-400"></i>
                    <span>Pool Khusus 100% Bebas Ninja Ampas (S / SS / SSS / UR)</span>
                </div>
            </div>

            <div>
                <div class="flex items-center justify-center gap-2 py-2 mb-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold text-base shadow-glow-gold/10">
                    <i class="fa-solid fa-gem text-amber-400"></i> 2,980 Gold
                </div>
                <div class="flex gap-2">
                    <button id="btn-crane_10x" onclick="drawGacha('crane_10x')" class="flex-1 btn-ninja-primary py-2.5 font-black bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 shadow-glow-ur">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Capit 10x Spesial
                    </button>
                    <button onclick="openRatesModal('crane')" class="btn-ninja-secondary px-3.5" title="Lihat Probabilitas & Roster">
                        <i class="fa-solid fa-list-check"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>

</div>

<!-- Modal 1: Single Recruit Modal -->
<div id="singleModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md hidden">
    <div class="glass-panel p-6 sm:p-8 max-w-sm w-full text-center relative border-2 border-ninja-orange/60 shadow-2xl animate-scale-up">
        <div id="singlePityNotice"></div>
        <div id="singleAvatarFrame" class="w-28 h-28 rounded-2xl mx-auto mb-4 border-4 overflow-hidden bg-black shadow-xl">
            <img id="singleAvatarImg" src="" alt="" class="w-full h-full object-cover">
        </div>
        <div id="singleGradeBadge" class="inline-block px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase mb-2"></div>
        <h2 id="singleNinjaName" class="font-title font-black text-2xl text-white mb-1"></h2>
        <p id="singleNinjaElement" class="text-xs text-ninja-cyan mb-4"></p>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 gap-2 p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-xs mb-6 text-left">
            <div class="flex justify-between items-center text-slate-300">
                <span class="text-slate-500 text-[10px] uppercase font-bold">ATK:</span>
                <span id="singleAtk" class="font-bold text-white"></span>
            </div>
            <div class="flex justify-between items-center text-slate-300">
                <span class="text-slate-500 text-[10px] uppercase font-bold">DEF:</span>
                <span id="singleDef" class="font-bold text-white"></span>
            </div>
            <div class="flex justify-between items-center text-slate-300">
                <span class="text-slate-500 text-[10px] uppercase font-bold">HP:</span>
                <span id="singleHp" class="font-bold text-white"></span>
            </div>
            <div class="flex justify-between items-center text-slate-300">
                <span class="text-slate-500 text-[10px] uppercase font-bold">AGI:</span>
                <span id="singleSpeed" class="font-bold text-white"></span>
            </div>
        </div>

        <button onclick="closeModal('singleModal')" class="w-full btn-ninja-primary py-2.5">
            <i class="fa-solid fa-check"></i> Masukkan ke Tim Shinobi
        </button>
    </div>
</div>

<!-- Modal 2: Multi-Recruit 10x Modal -->
<div id="multiModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md hidden overflow-y-auto">
    <div class="glass-panel p-6 max-w-4xl w-full border-2 border-amber-500/50 shadow-2xl animate-scale-up my-auto">
        <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <h3 id="multiTitle" class="font-title font-black text-lg text-amber-400 flex items-center gap-2">
                <i class="fa-solid fa-fire text-ninja-orange"></i> HASIL 10x REKRUTMEN SPESIAL
            </h3>
            <button onclick="closeModal('multiModal')" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>

        <div id="multiPityNotice" class="mb-4"></div>

        <!-- 10x Grid (5 cols on sm, 2 on mobile) -->
        <div id="multiGrid" class="grid grid-cols-2 sm:grid-cols-5 gap-3.5 max-h-[60vh] overflow-y-auto p-1">
            <!-- Injected via JS -->
        </div>

        <div class="mt-6 text-center">
            <button onclick="closeModal('multiModal')" class="btn-ninja-primary px-8 py-2.5">
                <i class="fa-solid fa-check"></i> Selesai & Simpan Semua ke Tim
            </button>
        </div>
    </div>
</div>

<!-- Modal 3: Rates & Available Pool Modal -->
<div id="ratesModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md hidden">
    <div class="glass-panel p-6 max-w-2xl w-full max-h-[85vh] flex flex-col border border-white/15 shadow-2xl">
        <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-4 flex-shrink-0">
            <h3 id="ratesTitle" class="font-title font-black text-base sm:text-lg text-white flex items-center gap-2">
                <i class="fa-solid fa-list-check text-ninja-orange"></i> PROBABILITAS & POOL SHINOBI
            </h3>
            <button onclick="closeModal('ratesModal')" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>

        <div id="ratesBody" class="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
            <!-- Dynamic rates table & roster -->
        </div>
    </div>
</div>

@endsection

@push('scripts')
<script>
    let globalGachaInfo = @json($gachaInfo);

    function switchBanner(type) {
        const hut = document.getElementById('bannerHutContainer');
        const crane = document.getElementById('bannerCraneContainer');
        const btnHut = document.getElementById('btnTabHut');
        const btnCrane = document.getElementById('btnTabCrane');

        if (type === 'crane') {
            hut.classList.add('hidden');
            crane.classList.remove('hidden');
            btnCrane.className = 'px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 bg-ninja-orange text-white shadow-glow-orange';
            btnHut.className = 'px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 text-slate-400 hover:text-white hover:bg-white/5';
        } else {
            crane.classList.add('hidden');
            hut.classList.remove('hidden');
            btnHut.className = 'px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 bg-ninja-orange text-white shadow-glow-orange';
            btnCrane.className = 'px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 text-slate-400 hover:text-white hover:bg-white/5';
        }
    }

    async function drawGacha(hutType) {
        const btn = document.getElementById(`btn-${hutType}`);
        const originalHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memanggil Chakra...`;
        }

        try {
            const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            const res = await fetch("{{ route('player.gacha.draw') }}", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": token,
                    "Accept": "application/json"
                },
                body: JSON.stringify({ hut_type: hutType })
            });

            const json = await res.json();
            if (json.status === 'success') {
                const data = json.data;
                // Update pity display
                if (data.pity) {
                    document.getElementById('pityCurrentNum').textContent = data.pity.current;
                    document.getElementById('pityRemainingCount').textContent = data.pity.remaining;
                    const pct = Math.min(100, Math.round((data.pity.current / 50) * 100));
                    document.getElementById('pityProgressBar').style.width = pct + '%';
                }

                if (data.count > 1) {
                    showMultiModal(data.recruited_ninjas, data.pity, data.hut_type);
                } else {
                    showSingleModal(data.recruited_ninja, data.pity);
                }
            } else {
                alert(json.message);
            }
        } catch (e) {
            alert("Terjadi kesalahan rekrutmen: " + e.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        }
    }

    function showSingleModal(ninja, pity) {
        const isPityUR = (ninja.grade === 'UR' && (ninja.is_pity || (pity && pity.triggered)));
        const pityNoticeEl = document.getElementById('singlePityNotice');
        if (isPityUR) {
            pityNoticeEl.innerHTML = `
                <div class="mb-3 p-2 rounded-xl bg-gradient-to-r from-pink-500/30 to-amber-500/30 border border-amber-500 text-amber-300 text-xs font-black animate-pulse">
                    👑 JAMINAN UR PITY TERCAPAI (50 TARIKAN)! 👑
                </div>
            `;
        } else {
            pityNoticeEl.innerHTML = '';
        }

        document.getElementById('singleAvatarImg').src = `/images/ninja_heads/${ninja.xmlfile || 'mingren'}_h.png`;
        document.getElementById('singleAvatarFrame').style.borderColor = getGradeColor(ninja.grade);
        
        const badge = document.getElementById('singleGradeBadge');
        badge.className = `inline-block px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase mb-2 badge-grade-${ninja.grade}`;
        badge.textContent = `GRADE ${ninja.grade}`;

        document.getElementById('singleNinjaName').textContent = ninja.name;
        document.getElementById('singleNinjaElement').textContent = `[${ninja.element || 'Neutral'}] • ${ninja.title || 'Shinobi'}`;
        document.getElementById('singleAtk').textContent = Number(ninja.base_atk).toLocaleString();
        document.getElementById('singleDef').textContent = Number(ninja.base_def).toLocaleString();
        document.getElementById('singleHp').textContent = Number(ninja.base_hp).toLocaleString();
        document.getElementById('singleSpeed').textContent = Number(ninja.base_speed).toLocaleString();

        openModal('singleModal');
    }

    function showMultiModal(ninjas, pity, hutType) {
        const titleEl = document.getElementById('multiTitle');
        const noticeEl = document.getElementById('multiPityNotice');
        const gridEl = document.getElementById('multiGrid');

        const isCrane = (hutType === 'crane_10x');
        titleEl.innerHTML = isCrane ?
            `<i class="fa-solid fa-gamepad text-pink-400"></i> HASIL 10x SPECIAL CLAW CRANE` :
            `<i class="fa-solid fa-fire text-ninja-orange"></i> HASIL 10x SPECIAL COMBO CAPTURE`;

        const hasPityTriggered = (pity && pity.triggered) || ninjas.some(n => n.is_pity);
        if (hasPityTriggered) {
            noticeEl.innerHTML = `
                <div class="p-2.5 rounded-xl bg-gradient-to-r from-pink-500/30 to-amber-500/30 border border-amber-500 text-amber-300 text-xs font-black text-center shadow-glow-gold">
                    👑 SELAMAT! JAMINAN UR PITY TERCAPAI! SHINOBI GRADE UR RESMI DIDAPATKAN! 👑
                </div>
            `;
        } else if (!isCrane) {
            noticeEl.innerHTML = `
                <div class="p-2 rounded-xl bg-ninja-orange/15 border border-ninja-orange/30 text-amber-300 text-xs text-center">
                    🔥 10x Combo Selesai • Slot ke-10 Menjamin Shinobi Class-A atau Lebih Tinggi! (+10 Pity UR)
                </div>
            `;
        } else {
            noticeEl.innerHTML = `
                <div class="p-2 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs text-center">
                    🎰 10x Claw Crane Selesai • Seluruh hasil dari Pool Elit (S / SS / SSS / UR)
                </div>
            `;
        }

        gridEl.innerHTML = ninjas.map((n, idx) => {
            const color = getGradeColor(n.grade);
            return `
                <div class="p-3 rounded-xl bg-black/40 border border-white/10 hover:border-white/30 flex flex-col items-center text-center relative group" style="border-color: ${color}66;">
                    ${n.is_pity ? `<span class="absolute top-1.5 right-1.5 text-[8px] font-black px-1.5 py-0.5 rounded bg-pink-500 text-white">👑 UR</span>` : ''}
                    ${n.is_guaranteed && !n.is_pity ? `<span class="absolute top-1.5 right-1.5 text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono">SLOT 10</span>` : ''}

                    <div class="w-14 h-14 rounded-xl border-2 bg-black overflow-hidden mb-2" style="border-color: ${color};">
                        <img src="/images/ninja_heads/${n.xmlfile || 'mingren'}_h.png" alt="${n.name}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='/images/ninja_heads/mingren_h.png';">
                    </div>
                    <div class="font-bold text-white text-xs truncate w-full">${n.name}</div>
                    <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase mt-1 badge-grade-${n.grade}">${n.grade}</span>
                    <span class="text-[10px] text-slate-400 mt-1 font-mono">ATK: ${Number(n.base_atk).toLocaleString()}</span>
                </div>
            `;
        }).join('');

        openModal('multiModal');
    }

    function openRatesModal(hutType) {
        const titleEl = document.getElementById('ratesTitle');
        const bodyEl = document.getElementById('ratesBody');
        const info = globalGachaInfo;

        let bannerName = "Ninja Hut";
        let rates = [];
        let note = "";
        let activeGrades = [];

        switch (hutType) {
            case 'basic':
                bannerName = "Basic Capture (Gedung 1 - 30.000 Silver)";
                rates = [
                    { grade: 'D', rate: '55.0%', desc: 'Ninja Genin dasar' },
                    { grade: 'C', rate: '35.0%', desc: 'Ninja Chunin' },
                    { grade: 'B', rate: '8.5%', desc: 'Ninja Jonin terampil' },
                    { grade: 'A', rate: '1.4%', desc: 'Shinobi Elit (Langka)' },
                    { grade: 'S', rate: '0.1%', desc: 'Legenda Dunia Shinobi (Sangat Langka)' }
                ];
                note = "Menggunakan Silver trap. Ninja kelas tinggi (A & S) memiliki peluang sangat kecil.";
                activeGrades = ['D', 'C', 'B', 'A', 'S'];
                break;
            case 'advanced':
                bannerName = "Advanced Capture (Gedung 1 - 298 Gold)";
                rates = [
                    { grade: 'B', rate: '55.0%', desc: 'Ninja Jonin terampil' },
                    { grade: 'A', rate: '32.0%', desc: 'Shinobi Elit Spesial' },
                    { grade: 'S', rate: '9.0%', desc: 'Kage & Pahlawan Desa' },
                    { grade: 'SS', rate: '3.0%', desc: 'Shinobi Legendaris Tingkat Tinggi' },
                    { grade: 'SSS', rate: '0.8%', desc: 'Transenden Sannin & Akatsuki Inti' },
                    { grade: 'UR', rate: '0.2%', desc: 'Dewa Shinobi Tertinggi (Ultimate Rare)' }
                ];
                note = "Setiap tarikan menambah +1 ke UR Pity Counter. Tarik 50 kali untuk 100% Garansi Shinobi Grade UR!";
                activeGrades = ['B', 'A', 'S', 'SS', 'SSS', 'UR'];
                break;
            case 'special':
                bannerName = "Special 10-Combo Capture (Gedung 1 - 2.980 Gold)";
                rates = [
                    { grade: 'Slot 1–9', rate: 'B: 55% s/d UR: 0.2%', desc: 'Peluang normal Advanced' },
                    { grade: 'Slot 10 Garansi A+', rate: '100% Guaranteed A+', desc: 'A: 50% • S: 30% • SS: 14% • SSS: 4.5% • UR: 1.5%' }
                ];
                note = "Pasti memberikan minimal 1 Ninja Class-A atau lebih tinggi di slot 10! Menambah +10 Progres Pity UR.";
                activeGrades = ['A', 'S', 'SS', 'SSS', 'UR'];
                break;
            case 'crane':
                bannerName = "Special Claw Crane (Gedung 17 - 298 / 2.980 Gold)";
                rates = [
                    { grade: 'S', rate: '88.4%', desc: 'Kage & Shinobi Rank S' },
                    { grade: 'SS', rate: '9.0%', desc: 'Shinobi Kelas SS' },
                    { grade: 'SSS', rate: '2.0%', desc: 'Shinobi Kelas SSS' },
                    { grade: 'UR', rate: '0.6%', desc: 'Shinobi Kelas UR' }
                ];
                note = "Mesin Capit Gedung 17 bebas ninja ampas (B/C/D). Hanya berisi ninja Grade S ke atas.";
                activeGrades = ['S', 'SS', 'SSS', 'UR'];
                break;
        }

        titleEl.textContent = bannerName;

        let ratesRows = rates.map(r => `
            <tr class="border-b border-white/5">
                <td class="py-2 px-3 font-bold font-mono text-white">${r.grade}</td>
                <td class="py-2 px-3 font-bold font-mono text-amber-400">${r.rate}</td>
                <td class="py-2 px-3 text-slate-300">${r.desc}</td>
            </tr>
        `).join('');

        let rosterHtml = '';
        if (info && info.roster) {
            rosterHtml = `
                <div class="mt-4 pt-4 border-t border-white/10">
                    <div class="font-bold text-white text-xs uppercase tracking-wider mb-2">Shinobi yang Tersedia di Pool Ini:</div>
                    <div class="space-y-3">
            `;

            activeGrades.forEach(g => {
                const list = info.roster[g] || [];
                if (list.length === 0) return;
                rosterHtml += `
                    <div class="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <div class="flex justify-between items-center mb-1.5">
                            <span class="px-2 py-0.5 rounded text-[10px] font-black badge-grade-${g}">GRADE ${g}</span>
                            <span class="text-[10px] text-slate-400 font-mono">${list.length} Shinobi</span>
                        </div>
                        <div class="flex flex-wrap gap-1">
                            ${list.map(n => `<span class="px-2 py-0.5 rounded bg-black/40 text-[10px] text-slate-300 border border-white/5">${n.name}</span>`).join('')}
                        </div>
                    </div>
                `;
            });

            rosterHtml += `</div></div>`;
        }

        bodyEl.innerHTML = `
            <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                <i class="fa-solid fa-circle-info mr-1"></i> ${note}
            </div>
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-white/10 text-slate-400 text-[11px] uppercase">
                        <th class="py-2 px-3">Grade</th>
                        <th class="py-2 px-3">Probabilitas</th>
                        <th class="py-2 px-3">Keterangan</th>
                    </tr>
                </thead>
                <tbody>${ratesRows}</tbody>
            </table>
            ${rosterHtml}
        `;

        openModal('ratesModal');
    }

    function openModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    }

    function closeModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    }

    function getGradeColor(grade) {
        switch(grade) {
            case 'UR': return '#ec4899';
            case 'SSS': return '#f97316';
            case 'SS': return '#eab308';
            case 'S': return '#ef4444';
            case 'A': return '#8b5cf6';
            case 'B': return '#3b82f6';
            case 'C': return '#10b981';
            case 'D': return '#64748b';
            default: return '#94a3b8';
        }
    }
</script>
@endpush
