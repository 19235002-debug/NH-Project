@if ($paginator->hasPages())
    <nav role="navigation" aria-label="Pagination Navigation" class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans select-none">
        {{-- Results Summary --}}
        <div class="text-slate-400 font-mono flex items-center gap-2 order-2 sm:order-1">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            @if ($paginator->firstItem())
                <span>Menampilkan <strong class="text-amber-400 font-bold">{{ $paginator->firstItem() }}</strong> - <strong class="text-amber-400 font-bold">{{ $paginator->lastItem() }}</strong> dari <strong class="text-white font-bold">{{ $paginator->total() }}</strong> data</span>
            @else
                <span>Total <strong class="text-white font-bold">{{ $paginator->total() }}</strong> data</span>
            @endif
        </div>

        {{-- Page Buttons --}}
        <div class="inline-flex items-center gap-1 order-1 sm:order-2">
            {{-- Previous Page Link --}}
            @if ($paginator->onFirstPage())
                <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.02] border border-white/5 text-slate-600 cursor-not-allowed opacity-40" aria-disabled="true" aria-label="Halaman Sebelumnya">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg>
                </span>
            @else
                <a href="{{ $paginator->previousPageUrl() }}" rel="prev" class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-ninja-card border border-white/10 text-slate-300 hover:text-amber-400 hover:bg-white/10 hover:border-amber-500/40 transition-all shadow-sm" aria-label="Halaman Sebelumnya">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg>
                </a>
            @endif

            {{-- Pagination Elements --}}
            @foreach ($elements as $element)
                {{-- "Three Dots" Separator --}}
                @if (is_string($element))
                    <span class="inline-flex items-center justify-center w-7 h-8 text-slate-500 font-mono text-xs">
                        {{ $element }}
                    </span>
                @endif

                {{-- Array Of Links --}}
                @if (is_array($element))
                    @foreach ($element as $page => $url)
                        @if ($page == $paginator->currentPage())
                            <span aria-current="page" class="inline-flex items-center justify-center min-w-[32px] h-8 px-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-mono font-bold text-xs shadow-md shadow-amber-500/25 border border-amber-400">
                                {{ $page }}
                            </span>
                        @else
                            <a href="{{ $url }}" class="inline-flex items-center justify-center min-w-[32px] h-8 px-2.5 rounded-lg bg-ninja-card border border-white/10 text-slate-300 hover:text-amber-400 hover:bg-white/10 hover:border-amber-500/40 font-mono text-xs transition-all shadow-sm">
                                {{ $page }}
                            </a>
                        @endif
                    @endforeach
                @endif
            @endforeach

            {{-- Next Page Link --}}
            @if ($paginator->hasMorePages())
                <a href="{{ $paginator->nextPageUrl() }}" rel="next" class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-ninja-card border border-white/10 text-slate-300 hover:text-amber-400 hover:bg-white/10 hover:border-amber-500/40 transition-all shadow-sm" aria-label="Halaman Berikutnya">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" /></svg>
                </a>
            @else
                <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.02] border border-white/5 text-slate-600 cursor-not-allowed opacity-40" aria-disabled="true" aria-label="Halaman Berikutnya">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" /></svg>
                </span>
            @endif
        </div>
    </nav>
@endif
