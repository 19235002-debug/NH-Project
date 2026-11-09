@extends('layouts.admin')

@section('title', 'Manajemen Pemain - GM Console')

@section('content')
<div class="space-y-6">

    <!-- Header & Search -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="font-title font-black text-2xl text-white tracking-wide">
                👥 MANAJEMEN PEMAIN
            </h1>
            <p class="text-xs text-slate-400 mt-1">
                Edit status pemain, suntikkan mata uang (Silver & Gold), atur hak akses GM, atau berikan shinobi secara instan.
            </p>
        </div>

        <form action="{{ route('admin.players') }}" method="GET" class="w-full sm:w-72">
            <div class="relative">
                <input type="text" name="q" value="{{ $search }}" placeholder="Cari username atau email..." class="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none">
                <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-xs text-slate-500"></i>
            </div>
        </form>
    </div>

    <!-- Players Table -->
    <div class="glass-panel overflow-hidden border border-white/10">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
                <thead>
                    <tr class="border-b border-white/10 bg-white/5 text-slate-400 text-[11px] uppercase tracking-wider font-mono">
                        <th class="py-3 px-4">ID</th>
                        <th class="py-3 px-4">Pemain</th>
                        <th class="py-3 px-4">Level / VIP</th>
                        <th class="py-3 px-4">Silver & Gold</th>
                        <th class="py-3 px-4">Stamina</th>
                        <th class="py-3 px-4">Ninja Dimiliki</th>
                        <th class="py-3 px-4">Status</th>
                        <th class="py-3 px-4 text-right">Aksi GM</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                    @forelse($players as $p)
                        <tr class="hover:bg-white/[0.02] transition-colors">
                            <td class="py-3 px-4 font-mono text-slate-500">#{{ $p->id }}</td>
                            <td class="py-3 px-4">
                                <div class="font-bold text-white flex items-center gap-1.5">
                                    {{ $p->username }}
                                    @if($p->isAdmin())
                                        <span class="px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">GM</span>
                                    @endif
                                </div>
                                <div class="text-[10px] text-slate-500">{{ $p->email ?: 'No email' }}</div>
                            </td>
                            <td class="py-3 px-4 font-mono">
                                <div class="text-white font-bold">Lv. {{ $p->level }}</div>
                                <div class="text-amber-400 text-[10px]">VIP {{ $p->vip_level }}</div>
                            </td>
                            <td class="py-3 px-4 font-mono">
                                <div class="text-slate-300">{{ number_format($p->silver) }} S</div>
                                <div class="text-amber-400 font-bold">{{ number_format($p->gold) }} G</div>
                            </td>
                            <td class="py-3 px-4 font-mono text-slate-300">
                                {{ $p->stamina }} / 150
                            </td>
                            <td class="py-3 px-4 font-mono">
                                <span class="px-2 py-0.5 rounded bg-white/5 text-slate-300 text-[11px]">
                                    {{ $p->player_ninjas_count }} Shinobi
                                </span>
                            </td>
                            <td class="py-3 px-4">
                                @if($p->is_banned)
                                    <span class="px-2 py-0.5 rounded text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30" title="{{ $p->ban_reason }}">
                                        BANNED
                                    </span>
                                @else
                                    <span class="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                        AKTIF
                                    </span>
                                @endif
                            </td>
                            <td class="py-3 px-4 text-right">
                                <div class="flex items-center justify-end gap-1.5">
                                    <!-- Edit Stats Button -->
                                    <button onclick="openEditModal({{ json_encode($p) }})" class="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10" title="Edit Level, VIP, Mata Uang">
                                        <i class="fa-solid fa-pen-to-square"></i>
                                    </button>

                                    <!-- Inject Ninja Button -->
                                    <button onclick="openInjectModal({{ $p->id }}, '{{ $p->username }}')" class="p-1.5 rounded-lg bg-ninja-orange/15 hover:bg-ninja-orange text-ninja-orange hover:text-white border border-ninja-orange/30" title="Suntikkan Shinobi ke Inventory">
                                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                                    </button>

                                    <!-- Ban / Unban Toggle -->
                                    @if($p->id !== Auth::id())
                                        <form action="{{ route('admin.players.toggle-ban', $p->id) }}" method="POST" class="inline" onsubmit="return confirm('Ubah status ban akun {{ $p->username }}?')">
                                            @csrf
                                            <button type="submit" class="p-1.5 rounded-lg {{ $p->is_banned ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black' : 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white' }} border border-white/10" title="{{ $p->is_banned ? 'Unban Pemain' : 'Ban Pemain' }}">
                                                <i class="fa-solid {{ $p->is_banned ? 'fa-user-check' : 'fa-ban' }}"></i>
                                            </button>
                                        </form>
                                    @endif
                                </div>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="8" class="text-center py-8 text-slate-500">Pemain tidak ditemukan.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div class="p-4 border-t border-white/10">
            {{ $players->links() }}
        </div>
    </div>

</div>

<!-- Modal 1: Edit Player Stats -->
<div id="editModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md hidden">
    <div class="glass-panel p-6 max-w-md w-full border border-amber-500/40 shadow-2xl animate-scale-up">
        <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <h3 class="font-title font-bold text-base text-amber-400 flex items-center gap-2">
                <i class="fa-solid fa-user-pen"></i> EDIT STATISTIK PEMAIN
            </h3>
            <button onclick="closeModal('editModal')" class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center">
                <i class="fa-solid fa-xmark text-xs"></i>
            </button>
        </div>

        <form id="editForm" method="POST" class="space-y-3 text-xs">
            @csrf
            <div>
                <label class="block text-slate-400 mb-1 font-bold">Pemain:</label>
                <div id="editPlayerName" class="font-bold text-white text-sm bg-black/40 p-2 rounded-lg border border-white/5"></div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-slate-400 mb-1 font-bold">Level Desa (1–150)</label>
                    <input type="number" id="editLevel" name="level" min="1" max="150" class="w-full p-2 rounded-lg bg-black/50 border border-white/10 text-white font-mono focus:border-amber-500 outline-none">
                </div>
                <div>
                    <label class="block text-slate-400 mb-1 font-bold">VIP Level (0–12)</label>
                    <input type="number" id="editVip" name="vip_level" min="0" max="12" class="w-full p-2 rounded-lg bg-black/50 border border-white/10 text-white font-mono focus:border-amber-500 outline-none">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-slate-400 mb-1 font-bold">Silver</label>
                    <input type="number" id="editSilver" name="silver" min="0" class="w-full p-2 rounded-lg bg-black/50 border border-white/10 text-white font-mono focus:border-amber-500 outline-none">
                </div>
                <div>
                    <label class="block text-slate-400 mb-1 font-bold">Gold</label>
                    <input type="number" id="editGold" name="gold" min="0" class="w-full p-2 rounded-lg bg-black/50 border border-white/10 text-white font-mono focus:border-amber-500 outline-none">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-slate-400 mb-1 font-bold">Stamina</label>
                    <input type="number" id="editStamina" name="stamina" min="0" max="999" class="w-full p-2 rounded-lg bg-black/50 border border-white/10 text-white font-mono focus:border-amber-500 outline-none">
                </div>
                <div>
                    <label class="block text-slate-400 mb-1 font-bold">Role Akun</label>
                    <select id="editRole" name="role" class="w-full p-2 rounded-lg bg-black/50 border border-white/10 text-white focus:border-amber-500 outline-none">
                        <option value="user">Player Biasa</option>
                        <option value="admin">Game Master (Admin)</option>
                    </select>
                </div>
            </div>

            <div class="pt-3 flex gap-2">
                <button type="button" onclick="closeModal('editModal')" class="flex-1 btn-ninja-secondary py-2 text-xs">Batal</button>
                <button type="submit" class="flex-1 btn-ninja-gold py-2 text-xs font-black">Simpan Perubahan</button>
            </div>
        </form>
    </div>
</div>

<!-- Modal 2: Inject Shinobi to Player -->
<div id="injectModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md hidden">
    <div class="glass-panel p-6 max-w-md w-full border border-ninja-orange/40 shadow-2xl animate-scale-up">
        <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <h3 class="font-title font-bold text-base text-ninja-orange flex items-center gap-2">
                <i class="fa-solid fa-wand-magic-sparkles"></i> SUNTIKKAN SHINOBI
            </h3>
            <button onclick="closeModal('injectModal')" class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center">
                <i class="fa-solid fa-xmark text-xs"></i>
            </button>
        </div>

        <form id="injectForm" method="POST" class="space-y-4 text-xs">
            @csrf
            <div>
                <label class="block text-slate-400 mb-1 font-bold">Penerima Shinobi:</label>
                <div id="injectPlayerName" class="font-bold text-white text-sm bg-black/40 p-2 rounded-lg border border-white/5"></div>
            </div>

            <div>
                <label class="block text-slate-400 mb-1 font-bold">Pilih Shinobi dari Master Database:</label>
                <select name="ninja_id" class="w-full p-2.5 rounded-lg bg-black/60 border border-white/10 text-white focus:border-ninja-orange outline-none" required>
                    @foreach($masterNinjas as $mn)
                        <option value="{{ $mn->id }}">
                            [{{ $mn->grade }}] {{ $mn->name }} (Quality {{ $mn->quality }})
                        </option>
                    @endforeach
                </select>
                <p class="text-[10px] text-slate-500 mt-1">Shinobi akan langsung ditambahkan ke inventori pemain pada Level 1.</p>
            </div>

            <div class="pt-2 flex gap-2">
                <button type="button" onclick="closeModal('injectModal')" class="flex-1 btn-ninja-secondary py-2 text-xs">Batal</button>
                <button type="submit" class="flex-1 btn-ninja-primary py-2 text-xs font-black">Suntikkan Sekarang</button>
            </div>
        </form>
    </div>
</div>

@endsection

@push('scripts')
<script>
    function openEditModal(player) {
        document.getElementById('editPlayerName').textContent = `${player.username} (ID: #${player.id})`;
        document.getElementById('editLevel').value = player.level;
        document.getElementById('editVip').value = player.vip_level;
        document.getElementById('editSilver').value = player.silver;
        document.getElementById('editGold').value = player.gold;
        document.getElementById('editStamina').value = player.stamina;
        document.getElementById('editRole').value = player.role;
        document.getElementById('editForm').action = `/admin/players/${player.id}/update`;

        openModal('editModal');
    }

    function openInjectModal(playerId, username) {
        document.getElementById('injectPlayerName').textContent = `${username} (ID: #${playerId})`;
        document.getElementById('injectForm').action = `/admin/players/${playerId}/add-ninja`;

        openModal('injectModal');
    }

    function openModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    }

    function closeModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    }
</script>
@endpush
