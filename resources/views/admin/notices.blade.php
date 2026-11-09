@extends('layouts.admin')

@section('title', 'Pengumuman Server & Hadiah Gold - GM Console')

@section('content')
<div class="space-y-6">

    <!-- Header & Quick Metrics -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 class="font-title font-black text-2xl text-white tracking-wide flex items-center gap-2">
                <span class="text-amber-400">📢</span> PENGUMUMAN SERVER & HADIAH GOLD
            </h1>
            <p class="text-xs text-slate-400 mt-1">
                Publikasikan pengumuman penting server, berikan reward Gold gratis ke pemain, dan kelola distribusi airdrop langsung.
            </p>
        </div>

        <div class="flex items-center gap-2">
            <div class="glass-panel px-4 py-2 text-right border-amber-500/30">
                <div class="text-[10px] text-slate-400 uppercase font-bold">Total Pengumuman</div>
                <div class="text-lg font-black text-white font-mono">{{ $notices->total() }}</div>
            </div>
            <div class="glass-panel px-4 py-2 text-right border-emerald-500/30">
                <div class="text-[10px] text-slate-400 uppercase font-bold">Aktif di Server</div>
                <div class="text-lg font-black text-emerald-400 font-mono">{{ $notices->where('is_active', 1)->count() }}</div>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Col 1: Form Siarkan Pengumuman Baru & Hadiah Gold -->
        <div class="glass-panel p-5 border border-amber-500/30 h-fit space-y-4">
            <h3 class="font-title font-bold text-sm text-amber-400 flex items-center gap-2">
                <i class="fa-solid fa-bullhorn"></i> SIARKAN PENGUMUMAN BARU
            </h3>

            <form action="{{ route('admin.notices.store') }}" method="POST" class="space-y-4 text-xs" id="noticeForm">
                @csrf
                <div>
                    <label class="block text-slate-300 font-bold mb-1">
                        Judul Pengumuman <span class="text-red-400">*</span>
                    </label>
                    <input type="text" name="title" required placeholder="Contoh: KOMPENSASI MAINTENANCE SERVER" class="w-full p-2.5 rounded-xl bg-black/50 border border-white/10 text-white focus:border-amber-500 outline-none transition-colors">
                </div>

                <div>
                    <label class="block text-slate-300 font-bold mb-1">
                        Isi Pesan Pengumuman <span class="text-red-400">*</span>
                    </label>
                    <textarea name="content" rows="4" required placeholder="Tuliskan detail info update server, pesan GM, atau instruksi event di sini..." class="w-full p-2.5 rounded-xl bg-black/50 border border-white/10 text-white focus:border-amber-500 outline-none transition-colors"></textarea>
                </div>

                <!-- Reward Gold Field -->
                <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                    <div class="flex items-center justify-between">
                        <label class="text-amber-300 font-bold flex items-center gap-1.5">
                            <i class="fa-solid fa-gem text-amber-400"></i> Hadiah Gold (Opsional)
                        </label>
                        <span class="text-[10px] text-amber-300/70 font-mono">Gratis untuk pemain</span>
                    </div>

                    <div class="relative">
                        <input type="number" name="reward_gold" id="rewardGoldInput" min="0" max="1000000" step="50" value="0" placeholder="0" class="w-full p-2.5 pl-8 rounded-xl bg-black/60 border border-amber-500/40 text-amber-300 font-mono font-bold text-sm focus:border-amber-400 outline-none">
                        <span class="absolute left-3 top-2.5 text-amber-400 font-bold">🪙</span>
                    </div>

                    <!-- Quick Preset Buttons -->
                    <div class="flex flex-wrap items-center gap-1.5 pt-1">
                        <span class="text-[10px] text-slate-400 mr-1">Preset:</span>
                        <button type="button" onclick="setGold(100)" class="px-2 py-0.5 rounded-md bg-white/5 hover:bg-amber-500/20 hover:text-amber-300 border border-white/10 text-[10px] font-mono text-slate-300 transition-colors">+100</button>
                        <button type="button" onclick="setGold(500)" class="px-2 py-0.5 rounded-md bg-white/5 hover:bg-amber-500/20 hover:text-amber-300 border border-white/10 text-[10px] font-mono text-slate-300 transition-colors">+500</button>
                        <button type="button" onclick="setGold(1000)" class="px-2 py-0.5 rounded-md bg-white/5 hover:bg-amber-500/20 hover:text-amber-300 border border-white/10 text-[10px] font-mono text-slate-300 transition-colors">+1,000</button>
                        <button type="button" onclick="setGold(5000)" class="px-2 py-0.5 rounded-md bg-white/5 hover:bg-amber-500/20 hover:text-amber-300 border border-white/10 text-[10px] font-mono text-slate-300 transition-colors">+5,000</button>
                        <button type="button" onclick="setGold(0)" class="px-2 py-0.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-mono transition-colors">Reset</button>
                    </div>
                </div>

                <!-- Checkboxes -->
                <div class="space-y-2 pt-1">
                    <label class="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" id="is_active" name="is_active" value="1" checked class="rounded bg-black/50 border-white/20 text-amber-500 focus:ring-0">
                        <span class="text-slate-300 font-bold">Aktifkan Segera di Server & Web</span>
                    </label>

                    <label class="flex items-start gap-2 cursor-pointer select-none p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <input type="checkbox" id="distribute_all" name="distribute_all" value="1" class="rounded mt-0.5 bg-black/50 border-white/20 text-amber-500 focus:ring-0">
                        <div class="text-[11px]">
                            <span class="text-amber-300 font-bold flex items-center gap-1">
                                <i class="fa-solid fa-paper-plane text-xs"></i> Airdrop Langsung ke Semua Akun
                            </span>
                            <p class="text-slate-400 mt-0.5 leading-tight">
                                Tambahkan nominal Gold secara instan ke seluruh saldo pemain aktif tanpa menunggu mereka mengklik tombol klaim.
                            </p>
                        </div>
                    </label>
                </div>

                <button type="submit" class="w-full btn-ninja-gold py-2.5 font-black text-xs shadow-glow-gold/30">
                    <i class="fa-solid fa-bullhorn mr-1.5"></i> Siarkan & Bagikan Sekarang
                </button>
            </form>
        </div>

        <!-- Col 2: Daftar Riwayat Pengumuman -->
        <div class="lg:col-span-2 glass-panel p-5 overflow-hidden">
            <h3 class="font-title font-bold text-sm text-white mb-4 flex items-center justify-between">
                <span><i class="fa-solid fa-list mr-2 text-slate-400"></i> RIWAYAT PENGUMUMAN SERVER</span>
                <span class="text-xs text-slate-400 font-mono font-normal">{{ $notices->total() }} Pengumuman Terdata</span>
            </h3>

            <div class="space-y-3">
                @forelse($notices as $n)
                    <div class="p-4 rounded-xl bg-black/40 border {{ $n->is_active ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/5 opacity-60' }} flex flex-col gap-3 text-xs transition-all hover:border-amber-500/60">
                        <!-- Top Row: Title, Badges & Date -->
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="font-bold text-white text-sm">{{ $n->title }}</span>

                                <!-- Status Badge -->
                                <span class="px-2 py-0.5 rounded text-[9px] font-black {{ $n->is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-500/20 text-slate-400' }}">
                                    {{ $n->is_active ? 'AKTIF' : 'NONAKTIF' }}
                                </span>

                                <!-- Gold Reward Badge -->
                                @if($n->reward_gold > 0)
                                    <span class="px-2 py-0.5 rounded text-[10px] font-black bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 shadow-glow-gold/10">
                                        <i class="fa-solid fa-gem text-amber-400 text-xs"></i>
                                        +{{ number_format($n->reward_gold) }} Gold
                                    </span>
                                @endif

                                <!-- Claim Count Badge -->
                                @if($n->reward_gold > 0)
                                    <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-slate-300 border border-white/10 flex items-center gap-1">
                                        <i class="fa-solid fa-users text-slate-400"></i>
                                        {{ number_format($n->claims_count ?? 0) }} Klaim
                                    </span>
                                @endif
                            </div>

                            <span class="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <i class="fa-regular fa-clock text-slate-500"></i>
                                {{ \Carbon\Carbon::parse($n->created_at)->timezone('Asia/Jakarta')->translatedFormat('d M Y, H:i') }} WIB
                            </span>
                        </div>

                        <!-- Content message -->
                        <div class="p-3 rounded-lg bg-black/30 border border-white/5 text-slate-300 text-xs leading-relaxed whitespace-pre-line">
                            {{ $n->content }}
                        </div>

                        <!-- Action Bar -->
                        <div class="flex items-center justify-between pt-1 border-t border-white/5 gap-2">
                            <div class="text-[10px] text-slate-500 font-mono">ID: #{{ $n->id }}</div>

                            <div class="flex items-center gap-2">
                                <!-- Direct Airdrop to remaining un-claimed players -->
                                @if($n->reward_gold > 0)
                                    <form action="{{ route('admin.notices.airdrop', $n->id) }}" method="POST" onsubmit="return confirm('Bagikan +{{ number_format($n->reward_gold) }} Gold ke semua pemain yang belum klaim?')">
                                        @csrf
                                        <button type="submit" class="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 hover:text-black border border-amber-500/40 text-amber-300 font-bold text-xs transition-all flex items-center gap-1.5" title="Kirim Gold ke semua pemain yang belum pernah klaim">
                                            <i class="fa-solid fa-paper-plane text-xs"></i>
                                            <span>Airdrop ke Semua</span>
                                        </button>
                                    </form>
                                @endif

                                <!-- Toggle Active -->
                                <form action="{{ route('admin.notices.toggle', $n->id) }}" method="POST">
                                    @csrf
                                    <button type="submit" class="px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all {{ $n->is_active ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500 hover:text-black' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white' }}" title="Ubah status tampil">
                                        {{ $n->is_active ? 'Nonaktifkan' : 'Aktifkan' }}
                                    </button>
                                </form>

                                <!-- Delete -->
                                <form action="{{ route('admin.notices.destroy', $n->id) }}" method="POST" onsubmit="return confirm('Hapus pengumuman ini beserta riwayat klaimnya?')">
                                    @csrf
                                    @method('DELETE')
                                    <button type="submit" class="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors" title="Hapus Pengumuman">
                                        <i class="fa-solid fa-trash text-xs"></i>
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                @empty
                    <div class="text-center py-12 glass-panel border border-dashed border-white/10 text-slate-500 text-xs">
                        <i class="fa-solid fa-bullhorn text-2xl mb-2 text-slate-600 block"></i>
                        Belum ada pengumuman server yang disiarkan.
                    </div>
                @endforelse
            </div>

            <div class="mt-4 pt-3 border-t border-white/10">
                {{ $notices->links() }}
            </div>
        </div>
    </div>

</div>

@push('scripts')
<script>
    function setGold(amount) {
        document.getElementById('rewardGoldInput').value = amount;
    }
</script>
@endpush
@endsection
