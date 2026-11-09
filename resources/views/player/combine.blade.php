@extends('layouts.player')

@section('title', 'Ninja Combine - Ninja Heroes')

@section('content')
<div class="space-y-6">

    <!-- Header -->
    <div class="text-center max-w-2xl mx-auto">
        <h1 class="font-title font-black text-3xl sm:text-4xl text-white tracking-wide">
            🔮 NINJA COMBINE
        </h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-2">
            Korbankan 3–5 ninja dari <strong>Grade yang sama</strong> untuk berevolusi ke Grade berikutnya!
        </p>
    </div>

    <!-- Combine Altar Card -->
    <div class="glass-panel p-6 sm:p-8 max-w-3xl mx-auto border-2 border-purple-500/40 shadow-2xl relative overflow-hidden">
        <form id="combineForm" action="{{ route('player.combine.execute') }}" method="POST">
            @csrf

            <!-- Slots container -->
            <div class="mb-6">
                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-4">
                    Slot Altar Sintesis Chakra (Pilih 3 s/d 5 Shinobi Bahan)
                </div>

                <div class="grid grid-cols-5 gap-2 sm:gap-4 max-w-lg mx-auto">
                    @for($i = 0; $i < 5; $i++)
                        <div id="slot-{{ $i }}" class="slot-box aspect-square rounded-2xl border-2 border-dashed border-white/20 bg-black/40 flex flex-col items-center justify-center text-center p-2 relative group transition-all">
                            <span class="text-2xl text-slate-600 mb-1 slot-empty-icon">➕</span>
                            <span class="text-[10px] text-slate-500 font-bold uppercase slot-label">Slot {{ $i + 1 }}</span>
                        </div>
                    @endfor
                </div>
            </div>

            <!-- Chance & Result Preview Box -->
            <div class="p-4 rounded-2xl bg-black/50 border border-white/10 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div>
                    <div class="text-xs text-slate-400">Peluang Keberhasilan Sintesis:</div>
                    <div id="chanceLabel" class="text-2xl font-black font-mono text-purple-400">0%</div>
                    <div class="text-[11px] text-slate-500">3 Ninja = 60% • 4 Ninja = 80% • 5 Ninja = 100% Garansi</div>
                </div>

                <div class="sm:text-right">
                    <div class="text-xs text-slate-400">Target Evolusi Hasil:</div>
                    <div id="targetGradeLabel" class="text-lg font-black font-mono text-amber-400">
                        Pilih Shinobi Bahan
                    </div>
                </div>
            </div>

            <!-- Hidden inputs container for selected ids -->
            <div id="selectedInputsContainer"></div>

            <button type="submit" id="btnSubmitCombine" disabled class="w-full btn-ninja-primary py-3 font-black text-base disabled:opacity-40 disabled:cursor-not-allowed">
                <i class="fa-solid fa-wand-magic-sparkles"></i> Jalankan Combine Sekarang
            </button>
        </form>
    </div>

    <!-- Available Candidate Ninjas List -->
    <div>
        <h3 class="font-title font-bold text-xl text-white mb-4 flex items-center gap-2">
            <i class="fa-solid fa-users text-ninja-cyan"></i> PILIH SHINOBI UNTUK DIKORBANKAN
        </h3>

        @if($candidates->isEmpty())
            <div class="glass-panel p-8 text-center text-slate-400 text-xs">
                Tidak ada shinobi bahan yang memenuhi syarat (Minimal butuh 3 ninja dengan grade yang sama, Main Ninja tidak dapat dikorbankan).
            </div>
        @else
            <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                @foreach($candidates as $c)
                    @php $m = $c->master; @endphp
                    <div onclick="toggleSelectNinja({{ $c->id }}, '{{ $m->grade }}', '{{ $m->name }}', '{{ $m->xmlfile }}')" 
                         id="candidate-{{ $c->id }}"
                         class="candidate-card glass-panel p-3 text-center cursor-pointer border border-white/10 hover:border-ninja-cyan transition-all relative select-none">
                        <div class="w-12 h-12 rounded-xl ninja-frame-{{ $m->grade }} bg-black mx-auto overflow-hidden mb-2">
                            <img src="{{ asset('images/ninja_heads/' . ($m->xmlfile ?? 'mingren') . '_h.png') }}" alt="" class="w-full h-full object-cover">
                        </div>
                        <span class="inline-block px-1.5 py-0.2 rounded text-[9px] font-black badge-grade-{{ $m->grade }}">
                            {{ $m->grade }}
                        </span>
                        <div class="font-bold text-white text-xs truncate mt-1">{{ $m->name }}</div>
                        <div class="text-[10px] text-slate-400 font-mono">Lv. {{ $c->level }}</div>
                    </div>
                @endforeach
            </div>
        @endif
    </div>

</div>
@endsection

@push('scripts')
<script>
    let selectedNinjas = [];
    let selectedGrade = null;

    const nextGradeMap = {
        'D': 'GRADE C',
        'C': 'GRADE B',
        'B': 'GRADE A',
        'A': 'GRADE S',
        'S': 'GRADE SS',
        'SS': 'GRADE SSS',
        'SSS': 'GRADE UR'
    };

    function toggleSelectNinja(id, grade, name, xmlfile) {
        const index = selectedNinjas.findIndex(n => n.id === id);

        if (index > -1) {
            // Deselect
            selectedNinjas.splice(index, 1);
            if (selectedNinjas.length === 0) {
                selectedGrade = null;
            }
        } else {
            // Check max 5
            if (selectedNinjas.length >= 5) {
                alert("Maksimal 5 shinobi bahan untuk combine.");
                return;
            }

            // Check matching grade
            if (selectedGrade && selectedGrade !== grade) {
                alert(`Semua ninja harus memiliki Grade yang sama! Saat ini Anda memilih Grade ${selectedGrade}.`);
                return;
            }

            selectedGrade = grade;
            selectedNinjas.push({ id, grade, name, xmlfile });
        }

        renderAltarSlots();
    }

    function renderAltarSlots() {
        const inputsContainer = document.getElementById('selectedInputsContainer');
        inputsContainer.innerHTML = '';

        // Reset all candidate cards highlight
        document.querySelectorAll('.candidate-card').forEach(el => {
            el.classList.remove('border-ninja-orange', 'bg-ninja-orange/20', 'shadow-glow-orange/30');
        });

        // Highlight selected candidate cards
        selectedNinjas.forEach(n => {
            const card = document.getElementById(`candidate-${n.id}`);
            if (card) {
                card.classList.add('border-ninja-orange', 'bg-ninja-orange/20', 'shadow-glow-orange/30');
            }
            inputsContainer.innerHTML += `<input type="hidden" name="ninja_ids[]" value="${n.id}">`;
        });

        // Render slots
        for (let i = 0; i < 5; i++) {
            const slot = document.getElementById(`slot-${i}`);
            if (selectedNinjas[i]) {
                const item = selectedNinjas[i];
                slot.innerHTML = `
                    <div class="w-10 h-10 rounded-lg bg-black overflow-hidden border border-ninja-orange mb-1">
                        <img src="/images/ninja_heads/${item.xmlfile || 'mingren'}_h.png" class="w-full h-full object-cover">
                    </div>
                    <div class="text-[9px] font-bold text-white truncate max-w-full">${item.name}</div>
                `;
                slot.className = "slot-box aspect-square rounded-2xl border-2 border-ninja-orange bg-ninja-orange/10 flex flex-col items-center justify-center text-center p-2 relative shadow-glow-orange/20";
            } else {
                slot.innerHTML = `
                    <span class="text-2xl text-slate-600 mb-1 slot-empty-icon">➕</span>
                    <span class="text-[10px] text-slate-500 font-bold uppercase slot-label">Slot ${i + 1}</span>
                `;
                slot.className = "slot-box aspect-square rounded-2xl border-2 border-dashed border-white/20 bg-black/40 flex flex-col items-center justify-center text-center p-2 relative";
            }
        }

        // Calculate chance & button state
        const count = selectedNinjas.length;
        const chanceEl = document.getElementById('chanceLabel');
        const targetGradeEl = document.getElementById('targetGradeLabel');
        const submitBtn = document.getElementById('btnSubmitCombine');

        if (count >= 3) {
            const rates = { 3: '60%', 4: '80%', 5: '100% (PASTI BERHASIL!)' };
            chanceEl.textContent = rates[count] || '0%';
            targetGradeEl.textContent = nextGradeMap[selectedGrade] || 'Shinobi Baru';
            submitBtn.disabled = false;
        } else {
            chanceEl.textContent = count > 0 ? `Pilih minimal 3 ninja (${count}/3)` : '0%';
            targetGradeEl.textContent = selectedGrade ? nextGradeMap[selectedGrade] : 'Pilih Shinobi Bahan';
            submitBtn.disabled = true;
        }
    }
</script>
@endpush
