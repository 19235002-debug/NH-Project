@extends('layouts.admin')

@section('title', 'Packet Inspector (APK) - GM Console')

@section('content')
<div class="space-y-6">

    <!-- Header & Clear Button -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="font-title font-black text-2xl text-white tracking-wide">
                📡 PACKET INSPECTOR (MOBILE APK)
            </h1>
            <p class="text-xs text-slate-400 mt-1">
                Monitor seluruh request HTTP/JSON yang dikirimkan oleh runtime game Cocos2d-x APK secara real-time.
            </p>
        </div>

        <div class="flex items-center gap-2">
            <span class="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold text-slate-300">
                Total Log: <span class="text-ninja-cyan">{{ number_format($totalPackets) }}</span>
            </span>
            <form action="{{ route('admin.inspector.clear') }}" method="POST" onsubmit="return confirm('Bersihkan seluruh riwayat packet log?')">
                @csrf
                <button type="submit" class="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-400 text-xs font-bold transition-all flex items-center gap-1.5">
                    <i class="fa-solid fa-trash-can"></i> Bersihkan Log
                </button>
            </form>
        </div>
    </div>

    <!-- Packets Table -->
    <div class="glass-panel overflow-hidden border border-white/10">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse font-mono">
                <thead>
                    <tr class="border-b border-white/10 bg-white/5 text-slate-400 text-[11px] uppercase tracking-wider font-sans">
                        <th class="py-3 px-4">ID</th>
                        <th class="py-3 px-4">Method</th>
                        <th class="py-3 px-4">Requested Endpoint</th>
                        <th class="py-3 px-4">Client IP</th>
                        <th class="py-3 px-4">Timestamp</th>
                        <th class="py-3 px-4">Payload / Body</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                    @forelse($packets as $p)
                        <tr class="hover:bg-white/[0.02] transition-colors">
                            <td class="py-3 px-4 text-slate-500">#{{ $p->id }}</td>
                            <td class="py-3 px-4">
                                <span class="px-2 py-0.5 rounded text-[10px] font-black {{ $p->method === 'POST' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30' }}">
                                    {{ $p->method }}
                                </span>
                            </td>
                            <td class="py-3 px-4 font-bold text-white text-[11px]">
                                /{{ $p->endpoint }}
                            </td>
                            <td class="py-3 px-4 text-slate-400 text-[11px]">
                                {{ $p->ip }}
                            </td>
                            <td class="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                                {{ date('Y-m-d H:i:s', strtotime($p->created_at)) }}
                            </td>
                            <td class="py-3 px-4 max-w-xs truncate text-slate-500 text-[10px]" title="{{ $p->body }}">
                                {{ $p->body ? substr($p->body, 0, 80) : '(empty body)' }}
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="6" class="text-center py-10 text-slate-500 font-sans text-xs">
                                Belum ada packet request yang terekam dari client game APK.
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div class="p-4 border-t border-white/10 font-sans">
            {{ $packets->links() }}
        </div>
    </div>

</div>
@endsection
