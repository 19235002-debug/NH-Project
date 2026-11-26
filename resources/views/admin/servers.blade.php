<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manajemen Server - Admin Ninja Heroes</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
    <nav class="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-6">
            <span class="text-xl font-bold text-amber-400">Ninja Heroes Admin</span>
            <div class="flex gap-4 text-sm">
                <a href="{{ route('admin.dashboard') }}" class="text-slate-300 hover:text-white">Dashboard</a>
                <a href="{{ route('admin.players') }}" class="text-slate-300 hover:text-white">Players</a>
                <a href="{{ route('admin.servers') }}" class="text-amber-400 font-semibold">Servers</a>
                <a href="{{ route('admin.notices') }}" class="text-slate-300 hover:text-white">Notices</a>
                <a href="{{ route('admin.inspector') }}" class="text-slate-300 hover:text-white">Inspector</a>
            </div>
        </div>
        <form action="{{ route('logout') }}" method="POST">
            @csrf
            <button type="submit" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 rounded text-sm font-medium">Logout</button>
        </form>
    </nav>

    <main class="max-w-6xl mx-auto p-6 space-y-6">
        @if(session('success'))
            <div class="bg-emerald-900/50 border border-emerald-500 text-emerald-200 px-4 py-3 rounded">
                {{ session('success') }}
            </div>
        @endif
        @if(session('error'))
            <div class="bg-rose-900/50 border border-rose-500 text-rose-200 px-4 py-3 rounded">
                {{ session('error') }}
            </div>
        @endif

        <div class="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 class="text-lg font-bold text-amber-400 mb-4">Tambah Server Baru</h2>
            <p class="text-xs text-slate-400 mb-4">
                Aturan Multi-Server: 1 server dapat menampung banyak player, 1 akun dapat memiliki karakter di banyak server, dan 1 server hanya boleh memiliki maksimal 1 player per akun.
            </p>
            <form action="{{ route('admin.servers.store') }}" method="POST" class="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                @csrf
                <div class="md:col-span-2">
                    <label class="block text-xs text-slate-400 mb-1">Nama Server</label>
                    <input type="text" name="name" placeholder="Contoh: S2 - Sunagakure" required class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1">Host / IP</label>
                    <input type="text" name="host" value="127.0.0.1" required class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1">Port WS</label>
                    <input type="number" name="port" value="8080" required class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1">Tag Status</label>
                    <select name="state_tag" class="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white">
                        <option value="smooth">Smooth</option>
                        <option value="new">New</option>
                        <option value="hot">Hot</option>
                        <option value="busy">Busy</option>
                        <option value="maintenance">Maintenance</option>
                    </select>
                </div>
                <div class="flex items-center gap-3">
                    <label class="inline-flex items-center text-xs text-slate-300">
                        <input type="checkbox" name="is_new" value="1" checked class="mr-1"> New
                    </label>
                    <label class="inline-flex items-center text-xs text-slate-300">
                        <input type="checkbox" name="is_recommend" value="1" checked class="mr-1"> Rec
                    </label>
                    <button type="submit" class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-sm">Tambah</button>
                </div>
            </form>
        </div>

        <div class="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 class="text-lg font-bold text-white mb-4">Daftar Server ({{ $servers->count() }})</h2>
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="text-xs uppercase text-slate-400 border-b border-slate-800">
                        <tr>
                            <th class="py-3 px-3">ID (SID)</th>
                            <th class="py-3 px-3">Nama Server</th>
                            <th class="py-3 px-3">Endpoint</th>
                            <th class="py-3 px-3">Player</th>
                            <th class="py-3 px-3">Status</th>
                            <th class="py-3 px-3">Tag</th>
                            <th class="py-3 px-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800">
                        @foreach($servers as $srv)
                        <tr>
                            <td class="py-3 px-3 font-mono text-amber-400">S{{ $srv->id }}</td>
                            <td class="py-3 px-3 font-medium">{{ $srv->name }}</td>
                            <td class="py-3 px-3 font-mono text-xs text-slate-300">{{ $srv->host }}:{{ $srv->port }}</td>
                            <td class="py-3 px-3">{{ $srv->player_count }}</td>
                            <td class="py-3 px-3">
                                @if($srv->status)
                                    <span class="px-2 py-0.5 bg-emerald-900/60 text-emerald-300 rounded text-xs">Online</span>
                                @else
                                    <span class="px-2 py-0.5 bg-rose-900/60 text-rose-300 rounded text-xs">Maintenance</span>
                                @endif
                            </td>
                            <td class="py-3 px-3 text-xs uppercase text-slate-300">{{ $srv->state_tag }}</td>
                            <td class="py-3 px-3 text-right space-x-2">
                                <form action="{{ route('admin.servers.toggle', $srv->id) }}" method="POST" class="inline">
                                    @csrf
                                    <button type="submit" class="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">
                                        {{ $srv->status ? 'Matikan' : 'Aktifkan' }}
                                    </button>
                                </form>
                                @if($srv->id != 1)
                                <form action="{{ route('admin.servers.destroy', $srv->id) }}" method="POST" class="inline" onsubmit="return confirm('Hapus server ini?')">
                                    @csrf
                                    @method('DELETE')
                                    <button type="submit" class="px-2.5 py-1 bg-rose-700 hover:bg-rose-600 rounded text-xs">Hapus</button>
                                </form>
                                @endif
                            </td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </div>
    </main>
</body>
</html>

