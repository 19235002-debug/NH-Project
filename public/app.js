/**
 * Ninja Heroes Server - Frontend Controller & API Integration
 */

// Dynamically determine the correct API base URL
const getApiBase = () => {
    let p = window.location.pathname;
    p = p.replace(/\/public(\/index\.php)?\/?$/, '').replace(/\/index\.php\/?$/, '').replace(/\/$/, '');
    return (p ? p : '') + '/api';
};
const API_BASE = getApiBase();

let authToken = localStorage.getItem('ninja_token') || '';
let currentUser = null;
let ownedNinjas = [];
let selectedForCombine = [];

/**
 * Robust API Fetcher with automatic token attachment and clean error extraction.
 */
async function apiFetch(endpoint, options = {}) {
    let url = endpoint.startsWith('http') ? endpoint : `${API_BASE}/${endpoint.replace(/^\//, '')}`;
    
    // Attach token to URL query parameter as well to bypass any Apache FastCGI header stripping
    if (authToken) {
        const sep = url.includes('?') ? '&' : '?';
        url += `${sep}token=${encodeURIComponent(authToken)}`;
    }

    const headers = {
        'Content-Type': 'application/json',
        ...(authToken ? {
            'Authorization': `Bearer ${authToken}`,
            'X-Session-Token': authToken
        } : {}),
        ...(options.headers || {})
    };

    const config = {
        ...options,
        headers
    };

    const res = await fetch(url, config);
    const text = await res.text();

    try {
        return JSON.parse(text);
    } catch (e) {
        // If not valid JSON, extract text preview for clean error reporting
        const cleanPreview = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
        throw new Error(cleanPreview || `HTTP ${res.status}: Invalid server response.`);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadServerAnnouncement();
    if (authToken) {
        loadUserProfile();
        loadNinjaInventory();
        loadGachaInfo();
    } else {
        showAuthModal();
    }
    loadPacketLogs();
});

// Tab Switcher & Navigation System
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            if (target === 'gm-console') {
                if (!currentUser || currentUser.role !== 'admin') {
                    const roleEl = document.getElementById('gmPromptCurrentRole');
                    if (roleEl && currentUser) {
                        roleEl.textContent = `${currentUser.username} (Player)`;
                    }
                    openModal('gmAccessRequiredModal');
                    return;
                }
            }
            activateTab(target);
        });
    });
}

function activateTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-pane').forEach(p => {
        p.classList.toggle('active', p.id === tabId);
    });

    // Refresh specific tab data
    if (tabId === 'hut') loadGachaInfo();
    if (tabId === 'inventory') loadNinjaInventory();
    if (tabId === 'inspector') loadPacketLogs();
    if (tabId === 'codex') loadCodexData();
    if (tabId === 'gm-console') loadGmConsole();
}

// User Profile
async function loadUserProfile() {
    try {
        const data = await apiFetch('player/info.php');
        if (data.status === 'success') {
            currentUser = data.data.player;
            updateTopBar(currentUser, data.data.main_ninja);
        } else {
            localStorage.removeItem('ninja_token');
            authToken = '';
            showAuthModal();
        }
    } catch (e) {
        console.error("Failed to load profile:", e);
    }
}

function updateTopBar(player, mainNinja) {
    document.getElementById('displayUsername').textContent = player.username;
    document.getElementById('displaySilver').textContent = parseInt(player.silver).toLocaleString();
    document.getElementById('displayGold').textContent = parseInt(player.gold).toLocaleString();
    document.getElementById('displayStamina').textContent = `${player.stamina}/${player.max_stamina || 100}`;
    
    const floorEl = document.getElementById('displayFloor');
    if (floorEl) floorEl.textContent = `Floor ${player.exam_floor || 1}`;

    // Mode Switcher Buttons & Role Badges
    const roleBadge = document.getElementById('userRoleBadge');
    const btnSwitchToGM = document.getElementById('btnSwitchToGM');
    const btnSwitchToPlayer = document.getElementById('btnSwitchToPlayer');
    const gmNavBtn = document.getElementById('tab-btn-gm');
    const isGM = (player.role === 'admin');

    if (btnSwitchToGM && btnSwitchToPlayer) {
        btnSwitchToGM.style.display = isGM ? 'none' : 'inline-flex';
        btnSwitchToPlayer.style.display = isGM ? 'inline-flex' : 'none';
    }

    if (roleBadge) {
        if (isGM) {
            roleBadge.innerHTML = `<span class="badge-gm"><i class="fa-solid fa-crown"></i> GAME MASTER</span>`;
            roleBadge.style.display = 'inline-flex';
        } else {
            roleBadge.innerHTML = `<span class="badge-player"><i class="fa-solid fa-user-ninja"></i> PLAYER</span>`;
            roleBadge.style.display = 'inline-flex';
        }
    }

    if (gmNavBtn) {
        gmNavBtn.classList.toggle('gm-active-role', isGM);
    }

    // If regular player accidentally in GM console, switch back to hut
    if (!isGM) {
        const gmPane = document.getElementById('gm-console');
        if (gmPane && gmPane.classList.contains('active')) {
            activateTab('hut');
        }
    }
    
    if (mainNinja) {
        document.getElementById('mainNinjaBadge').innerHTML = `
            <span class="badge-grade grade-${mainNinja.grade}">${mainNinja.grade}</span>
            <strong style="color: #fff;">${mainNinja.name}</strong> <span style="color: var(--text-muted);">(Lv. ${mainNinja.level})</span>
        `;
    }
}

// Claim Ramen
async function claimRamen() {
    try {
        const data = await apiFetch('player/ramen.php', { method: 'POST' });
        alert(data.message);
        loadUserProfile();
    } catch (e) {
        alert("Ramen claim error: " + e.message);
    }
}

// Ninja Hut & Claw Crane Gacha Controller (Building 1 & Building 17)
window.gachaInfo = null;

async function loadGachaInfo() {
    try {
        const json = await apiFetch('gacha/info.php');
        if (json.status === 'success') {
            window.gachaInfo = json.data;
            updateGachaPityUI(json.data.pity);
        }
    } catch (e) {
        console.error("Failed to load gacha info:", e);
    }
}

function updateGachaPityUI(pity) {
    if (!pity) return;
    const currentEl = document.getElementById('pityCurrentNum');
    const remainingEl = document.getElementById('pityRemainingCount');
    const barEl = document.getElementById('pityProgressBar');

    if (currentEl) currentEl.textContent = pity.current;
    if (remainingEl) remainingEl.textContent = pity.remaining;
    if (barEl) {
        const threshold = pity.threshold || 50;
        const pct = Math.min(100, Math.round((pity.current / threshold) * 100));
        barEl.style.width = `${pct}%`;
        if (pct >= 100) {
            barEl.style.boxShadow = '0 0 20px #f59e0b, 0 0 35px #ec4899';
        }
    }
}

function switchGachaBanner(banner) {
    const hutContainer = document.getElementById('ninjaHutContainer');
    const craneContainer = document.getElementById('clawCraneContainer');
    const btnTabHut = document.getElementById('btnTabHut');
    const btnTabCrane = document.getElementById('btnTabCrane');

    if (banner === 'crane') {
        if (hutContainer) hutContainer.style.display = 'none';
        if (craneContainer) craneContainer.style.display = 'grid';
        if (btnTabHut) btnTabHut.classList.remove('active');
        if (btnTabCrane) btnTabCrane.classList.add('active');
    } else {
        if (hutContainer) hutContainer.style.display = 'grid';
        if (craneContainer) craneContainer.style.display = 'none';
        if (btnTabHut) btnTabHut.classList.add('active');
        if (btnTabCrane) btnTabCrane.classList.remove('active');
    }
}

async function drawGacha(hutType) {
    const btn = document.getElementById(`btn-${hutType}`);
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menghubungi Server...`;
    }

    try {
        const json = await apiFetch('gacha/draw.php', {
            method: 'POST',
            body: JSON.stringify({ hut_type: hutType })
        });

        if (json.status === 'success') {
            const data = json.data;
            if (data.count > 1) {
                showMultiRecruitModal(data.recruited_ninjas, data.pity, data.hut_type);
            } else {
                showRecruitModal(data.recruited_ninja, data.pity);
            }
            if (data.pity) {
                updateGachaPityUI(data.pity);
            }
            loadGachaInfo();
            loadUserProfile();
            loadNinjaInventory();
        } else {
            alert(json.message);
        }
    } catch (e) {
        alert("Rekrutmen Shinobi gagal: " + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

function showRecruitModal(ninja, pityInfo) {
    const modal = document.getElementById('recruitModal');
    const content = document.getElementById('recruitResultContent');
    const gradeColor = getGradeColor(ninja.grade);
    const isPityUR = (ninja.grade === 'UR' && (ninja.is_pity || (pityInfo && pityInfo.triggered)));

    let pityBannerHtml = '';
    if (isPityUR) {
        pityBannerHtml = `
            <div style="background: linear-gradient(135deg, rgba(236,72,153,0.3), rgba(245,158,11,0.3)); border: 1px solid #f59e0b; border-radius: 8px; padding: 8px 12px; margin-bottom: 1rem; color: #ffd700; font-weight: 800; font-size: 0.9rem; text-shadow: 0 0 10px rgba(245,158,11,0.8); display: flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="fa-solid fa-crown" style="color: #ffd700;"></i> JAMINAN UR PITY TERCAPAI (50 TARIKAN)! <i class="fa-solid fa-crown" style="color: #ffd700;"></i>
            </div>
        `;
    }

    content.innerHTML = `
        <div style="text-align: center;">
            ${pityBannerHtml}
            <div class="card-avatar-frame" style="width: 110px; height: 110px; margin: 0 auto 1rem; border: 3px solid ${gradeColor}; border-radius: 8px; box-shadow: 0 0 25px ${gradeColor}88;">
                <img src="images/ninja_heads/${ninja.xmlfile || 'mingren'}_h.png" alt="${ninja.name}" onerror="this.onerror=null;this.src='images/ninja_heads/mingren_h.png';">
            </div>
            <span class="badge-grade grade-${ninja.grade}" style="font-size: 1.05rem; padding: 4px 18px; margin-bottom: 0.8rem; letter-spacing: 1px;">GRADE ${ninja.grade}</span>
            <h2 style="font-family: var(--font-title); font-size: 2rem; margin: 0.5rem 0 0.2rem 0; color: #fff;">${ninja.name}</h2>
            <p style="color: var(--text-muted); margin-bottom: 1.2rem; font-size: 0.95rem;">${ninja.title || 'Shinobi'} • [${ninja.element || 'Neutral'}]</p>
            
            <div class="ninja-portrait-card grade-${ninja.grade}" style="max-width: 260px; margin: 0 auto 1.5rem auto; cursor: default; border: 1px solid ${gradeColor}66;">
                <div class="card-stats-grid" style="font-size: 0.95rem; row-gap: 6px;">
                    <div class="stat-col"><span class="stat-lbl">ATK</span> <span class="stat-num">${Number(ninja.base_atk).toLocaleString('en-US')}</span></div>
                    <div class="stat-col right"><span class="stat-lbl">DEF</span> <span class="stat-num">${Number(ninja.base_def).toLocaleString('en-US')}</span></div>
                    <div class="stat-col"><span class="stat-lbl">HP</span> <span class="stat-num">${Number(ninja.base_hp).toLocaleString('en-US')}</span></div>
                    <div class="stat-col right"><span class="stat-lbl">AGI</span> <span class="stat-num">${Number(ninja.base_speed).toLocaleString('en-US')}</span></div>
                </div>
            </div>

            <button class="btn btn-primary" onclick="closeModal('recruitModal')" style="padding: 10px 28px; font-weight: 700;">
                <i class="fa-solid fa-check"></i> Masukkan ke Tim Shinobi
            </button>
        </div>
    `;
    openModal('recruitModal');
}

function showMultiRecruitModal(ninjas, pityInfo, hutType) {
    const titleEl = document.getElementById('multiRecruitModalTitle');
    const noticeEl = document.getElementById('multiRecruitPityNotice');
    const gridEl = document.getElementById('multiRecruitGrid');

    const isCrane = (hutType === 'crane_10x');
    if (titleEl) {
        titleEl.innerHTML = isCrane ?
            `<i class="fa-solid fa-gamepad" style="color: #ec4899;"></i> HASIL 10x SPECIAL CLAW CRANE` :
            `<i class="fa-solid fa-fire" style="color: var(--sharingan-red);"></i> HASIL 10x SPECIAL COMBO CAPTURE`;
    }

    const hasPityTriggered = (pityInfo && pityInfo.triggered) || ninjas.some(n => n.is_pity);
    if (noticeEl) {
        if (hasPityTriggered) {
            noticeEl.innerHTML = `
                <div style="background: linear-gradient(135deg, rgba(236,72,153,0.3), rgba(245,158,11,0.3)); border: 1px solid #f59e0b; border-radius: 8px; padding: 10px 14px; color: #ffd700; font-weight: 800; font-size: 0.92rem; text-shadow: 0 0 10px rgba(245,158,11,0.8); display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fa-solid fa-crown"></i> SELAMAT! JAMINAN UR PITY TERCAPAI! SHINOBI GRADE UR DIDAPATKAN! <i class="fa-solid fa-crown"></i>
                </div>
            `;
        } else if (!isCrane) {
            noticeEl.innerHTML = `
                <div style="background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.35); border-radius: 8px; padding: 8px 12px; color: #fca5a5; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <i class="fa-solid fa-circle-check" style="color: #4ade80;"></i>
                    10-Combo Capture Selesai • Slot ke-10 Menjamin Shinobi Class-A atau Lebih Tinggi! (+10 Pity UR)
                </div>
            `;
        } else {
            noticeEl.innerHTML = `
                <div style="background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.35); border-radius: 8px; padding: 8px 12px; color: #fde68a; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <i class="fa-solid fa-gamepad" style="color: #f59e0b;"></i>
                    Mesin Capit Gedung 17 • 10 Tarikan dari Pool Elit (S, SS, SSS, UR)
                </div>
            `;
        }
    }

    if (gridEl) {
        gridEl.innerHTML = ninjas.map((n, idx) => {
            const gradeColor = getGradeColor(n.grade);
            const isGuaranteed = n.is_guaranteed;
            const isPity = n.is_pity;

            return `
                <div class="multi-card-item rarity-${n.grade}" style="animation: fadeInScale 0.35s ease forwards; animation-delay: ${idx * 60}ms;">
                    ${isPity ? `<span class="slot-pity-tag">👑 UR PITY</span>` : ''}
                    ${isGuaranteed && !isPity ? `<span class="slot-guaranteed-tag">GUARANTEE</span>` : ''}
                    
                    <div class="mini-avatar" style="border-color: ${gradeColor};">
                        <img src="images/ninja_heads/${n.xmlfile || 'mingren'}_h.png" alt="${n.name}" onerror="this.onerror=null;this.src='images/ninja_heads/mingren_h.png';">
                    </div>
                    <div class="mini-name" title="${n.name}">${n.name}</div>
                    <span class="badge-grade grade-${n.grade} mini-badge">${n.grade}</span>
                    <div style="font-size: 0.68rem; color: #94a3b8; margin-top: 3px;">[${n.element || 'Neutral'}]</div>
                    <div style="font-size: 0.68rem; color: #e2e8f0; margin-top: 4px; font-weight: 600;">
                        ⚔️ ${Number(n.base_atk).toLocaleString('en-US')}
                    </div>
                </div>
            `;
        }).join('');
    }

    openModal('multiRecruitModal');
}

function showRatesModal(hutType) {
    const titleEl = document.getElementById('ratesModalTitle');
    const bodyEl = document.getElementById('ratesModalBody');
    const info = window.gachaInfo;

    let bannerName = "Ninja Hut";
    let rates = [];
    let noteText = "";
    let activeGrades = [];

    switch (hutType) {
        case 'basic':
            bannerName = "Basic Capture (Gedung 1 - 30,000 Silver)";
            rates = [
                { grade: 'D', rate: '55.0%', desc: 'Ninja Genin dasar' },
                { grade: 'C', rate: '35.0%', desc: 'Ninja Chunin' },
                { grade: 'B', rate: '8.5%', desc: 'Ninja Jonin terampil' },
                { grade: 'A', rate: '1.4%', desc: 'Shinobi Elit (Langka)' },
                { grade: 'S', rate: '0.1%', desc: 'Legenda Dunia Shinobi (Sangat Langka)' }
            ];
            noteText = "Menggunakan Silver trap. Ninja kelas tinggi (A & S) memiliki peluang sangat kecil dan bisa lolos.";
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
            noteText = "Setiap tarikan Advanced Capture menambah +1 ke UR Pity Counter. Tarik 50 kali untuk mengklaim 1 Shinobi Grade UR 100% Garansi!";
            activeGrades = ['B', 'A', 'S', 'SS', 'SSS', 'UR'];
            break;

        case 'special':
            bannerName = "Special 10-Combo Capture (Gedung 1 - 2,980 Gold)";
            rates = [
                { grade: 'Slot 1-9 (Biasa)', rate: 'Sama dengan Advanced', desc: 'Roll reguler B (55%) s/d UR (0.2%)' },
                { grade: 'Slot 10 (Garansi Grade A+)', rate: '100% Guaranteed A+', desc: 'A: 50.0% • S: 30.0% • SS: 14.0% • SSS: 4.5% • UR: 1.5%' }
            ];
            noteText = "10-combo capture otomatis melakukan 10 tarikan sekaligus dan PASTI memberikan minimal 1 Ninja Class-A atau lebih tinggi pada slot ke-10! Menambahkan +10 ke UR Pity Counter.";
            activeGrades = ['A', 'S', 'SS', 'SSS', 'UR'];
            break;

        case 'crane':
        case 'crane_10x':
            bannerName = "Special Claw Crane (Gedung 17 - 298 / 2,980 Gold)";
            rates = [
                { grade: 'S', rate: '88.4%', desc: 'Kage & Ninja Rank S (Catchninja.js)' },
                { grade: 'SS', rate: '9.0%', desc: 'Shinobi Kelas SS' },
                { grade: 'SSS', rate: '2.0%', desc: 'Shinobi Kelas SSS' },
                { grade: 'UR', rate: '0.6%', desc: 'Shinobi Kelas UR (0.6% Rate Otentik)' }
            ];
            noteText = "Mesin Capit Khusus Gedung 17 bebas dari ninja kelas bawah (B, C, D). Hanya berisi ninja Grade S, SS, SSS, dan UR.";
            activeGrades = ['S', 'SS', 'SSS', 'UR'];
            break;
    }

    if (titleEl) {
        titleEl.innerHTML = `<i class="fa-solid fa-list-check" style="color: var(--chakra-orange);"></i> ${bannerName}`;
    }

    let ratesRows = rates.map(r => `
        <tr>
            <td style="font-weight: 800; font-family: var(--font-mono);">
                <span class="badge-grade grade-${r.grade.replace(/[^A-Z]/g, '') || 'S'}" style="font-size: 0.75rem; padding: 2px 8px;">${r.grade}</span>
            </td>
            <td style="font-weight: 800; color: #ffd700; font-family: var(--font-mono);">${r.rate}</td>
            <td>${r.desc}</td>
        </tr>
    `).join('');

    // Roster lists grouped by active grades
    let rosterHtml = '';
    if (info && info.roster) {
        rosterHtml = `
            <div style="margin-top: 1.5rem; border-top: 1px solid var(--border-glass); padding-top: 1.2rem;">
                <h4 style="color: #fff; font-family: var(--font-title); margin-bottom: 0.8rem; font-size: 1.05rem; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-users-viewfinder" style="color: #38bdf8;"></i> DAFTAR SHINOBI DALAM POOL INI
                </h4>
                <div style="display: flex; flex-direction: column; gap: 12px;">
        `;

        // Render each active grade section
        activeGrades.forEach(g => {
            const list = info.roster[g] || [];
            if (list.length === 0) return;
            const gradeColor = getGradeColor(g);

            rosterHtml += `
                <div style="background: rgba(0,0,0,0.35); border: 1px solid ${gradeColor}44; border-radius: 8px; padding: 10px 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span class="badge-grade grade-${g}" style="font-size: 0.78rem; padding: 2px 10px;">GRADE ${g}</span>
                        <span style="font-size: 0.76rem; color: #94a3b8;">${list.length} Shinobi Tersedia</span>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        ${list.map(n => `
                            <span style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 3px 8px; font-size: 0.78rem; color: #e2e8f0; display: inline-flex; align-items: center; gap: 5px;" title="${n.name} [${n.element}]">
                                <span style="color: ${gradeColor}; font-size: 0.65rem;">●</span> ${n.name}
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        rosterHtml += `
                </div>
            </div>
        `;
    }

    if (bodyEl) {
        bodyEl.innerHTML = `
            <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 10px 14px; margin-bottom: 1rem; color: #fde68a; font-size: 0.85rem; line-height: 1.5;">
                <i class="fa-solid fa-circle-info" style="color: #f59e0b; margin-right: 6px;"></i> ${noteText}
            </div>

            <table class="rates-table">
                <thead>
                    <tr>
                        <th style="width: 25%;">Tingkat (Grade)</th>
                        <th style="width: 25%;">Probabilitas</th>
                        <th style="width: 50%;">Keterangan</th>
                    </tr>
                </thead>
                <tbody>
                    ${ratesRows}
                </tbody>
            </table>

            ${rosterHtml}
        `;
    }

    openModal('ratesModal');
}

// Ninja Inventory
async function loadNinjaInventory() {
    try {
        const json = await apiFetch('ninja/list.php');
        if (json.status === 'success') {
            ownedNinjas = json.data.ninjas;
            renderInventoryGrid();
            renderCombineGrid();
        }
    } catch (e) {
        console.error("Failed to load inventory:", e);
    }
}

function renderInventoryGrid() {
    const container = document.getElementById('ninjaInventoryGrid');
    if (!container) return;
    container.innerHTML = '';

    if (ownedNinjas.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">No ninjas recruited yet. Visit the Ninja Hut to summon!</div>`;
        return;
    }

    ownedNinjas.forEach(n => {
        const card = document.createElement('div');
        card.className = `ninja-portrait-card grade-${n.grade} ${n.is_main == 1 ? 'is-deployed' : ''}`;
        card.innerHTML = `
            <div class="card-grade-badge">${n.grade}</div>
            ${n.is_main == 1 ? '<div class="deployed-ribbon">DEPLOYED</div>' : ''}
            <div class="card-avatar-frame">
                <img src="images/ninja_heads/${n.xmlfile || 'mingren'}_h.png" alt="${n.name}" onerror="this.onerror=null;this.src='images/ninja_heads/mingren_h.png';">
            </div>
            <div class="card-ninja-name" title="${n.name}">${n.name}</div>
            <div class="card-level-tag">Level <strong>Lv. ${n.level}</strong></div>
            <div class="card-stats-grid">
                <div class="stat-col"><span class="stat-lbl">ATK</span> <span class="stat-num">${Number(n.atk).toLocaleString('en-US')}</span></div>
                <div class="stat-col right"><span class="stat-lbl">DEF</span> <span class="stat-num">${Number(n.def).toLocaleString('en-US')}</span></div>
                <div class="stat-col"><span class="stat-lbl">HP</span> <span class="stat-num">${Number(n.hp).toLocaleString('en-US')}</span></div>
                <div class="stat-col right"><span class="stat-lbl">AGI</span> <span class="stat-num">${Number(n.speed).toLocaleString('en-US')}</span></div>
            </div>
            <div style="font-size: 0.72rem; color: #94a3b8; margin: 8px 0 4px 0; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">
                ⚡ <strong style="color: #cbd5e1;">${n.jutsu_1_name || 'Standard Strike'}</strong>
            </div>
            <div class="card-actions">
                ${n.is_main == 0 ? `<button class="btn btn-secondary" onclick="setMainNinja(${n.player_ninja_id})">Deploy</button>` : ''}
                <button class="btn btn-cyan" onclick="levelUpNinja(${n.player_ninja_id})">Upgrade</button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function setMainNinja(playerNinjaId) {
    try {
        const json = await apiFetch('ninja/upgrade.php', {
            method: 'POST',
            body: JSON.stringify({ action: 'set_main', player_ninja_id: playerNinjaId })
        });
        alert(json.message);
        loadUserProfile();
        loadNinjaInventory();
    } catch (e) {
        alert("Failed to set main ninja: " + e.message);
    }
}

async function levelUpNinja(playerNinjaId) {
    try {
        const json = await apiFetch('ninja/upgrade.php', {
            method: 'POST',
            body: JSON.stringify({ action: 'level_up', player_ninja_id: playerNinjaId })
        });
        if (json.status === 'success') {
            loadUserProfile();
            loadNinjaInventory();
        } else {
            alert(json.message);
        }
    } catch (e) {
        alert("Failed to level up ninja: " + e.message);
    }
}

// Ninja Combine
function renderCombineGrid() {
    const container = document.getElementById('combineInventoryGrid');
    if (!container) return;
    container.innerHTML = '';

    const eligible = ownedNinjas.filter(n => n.is_main == 0 && n.grade !== 'SS');
    if (eligible.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">No spare ninjas available for combine. (Main deployed ninja & Grade SS ninjas cannot be sacrificed)</div>`;
        return;
    }

    eligible.forEach(n => {
        const isSelected = selectedForCombine.includes(n.player_ninja_id);
        const card = document.createElement('div');
        card.className = `ninja-portrait-card grade-${n.grade} ${isSelected ? 'is-deployed' : ''}`;
        card.style.cursor = 'pointer';
        card.onclick = () => toggleSelectForCombine(n.player_ninja_id, n.grade);
        card.innerHTML = `
            <div class="card-grade-badge">${n.grade}</div>
            <div class="card-avatar-frame">
                <img src="images/ninja_heads/${n.xmlfile || 'mingren'}_h.png" alt="${n.name}" onerror="this.onerror=null;this.src='images/ninja_heads/mingren_h.png';">
            </div>
            <div class="card-ninja-name" title="${n.name}">${n.name}</div>
            <div class="card-level-tag">Lv. <strong>${n.level}</strong></div>
            <div style="font-size: 0.76rem; color: ${isSelected ? '#ff5722' : '#94a3b8'}; text-align: center; margin-top: auto; font-weight: 800;">
                ${isSelected ? '✓ SELECTED' : '+ SELECT'}
            </div>
        `;
        container.appendChild(card);
    });

    updateCombineStatus();
}

function toggleSelectForCombine(id, grade) {
    const idx = selectedForCombine.indexOf(id);
    if (idx > -1) {
        selectedForCombine.splice(idx, 1);
    } else {
        if (selectedForCombine.length >= 5) {
            alert("Maximum 5 ninjas can be combined at once.");
            return;
        }
        // Verify same grade
        if (selectedForCombine.length > 0) {
            const first = ownedNinjas.find(n => n.player_ninja_id === selectedForCombine[0]);
            if (first && first.grade !== grade) {
                alert(`All ninjas to combine must be of the exact same grade (${first.grade})!`);
                return;
            }
        }
        selectedForCombine.push(id);
    }
    renderCombineGrid();
}

function updateCombineStatus() {
    const count = selectedForCombine.length;
    let rate = 0;
    if (count === 3) rate = 40;
    if (count === 4) rate = 70;
    if (count === 5) rate = 100;

    document.getElementById('combineCount').textContent = count;
    document.getElementById('combineRate').textContent = `${rate}%`;
    const btn = document.getElementById('btnExecuteCombine');
    if (btn) btn.disabled = (count < 3);
}

async function executeCombine() {
    if (selectedForCombine.length < 3) return;

    try {
        const json = await apiFetch('ninja/combine.php', {
            method: 'POST',
            body: JSON.stringify({ player_ninja_ids: selectedForCombine })
        });
        alert(json.message);
        selectedForCombine = [];
        loadUserProfile();
        loadNinjaInventory();
    } catch (e) {
        alert("Combine failed: " + e.message);
    }
}

// Battles: Ninja Exam & PVP Arena
async function startExamBattle() {
    runBattle('battle/exam.php', {});
}

async function startArenaBattle() {
    runBattle('battle/arena.php', {});
}

async function runBattle(endpoint, payload) {
    const box = document.getElementById('combatLogsBox');
    box.innerHTML = `<div style="text-align: center; color: var(--rasengan-cyan); padding-top: 50px;">Summoning fighters to the arena...</div>`;

    try {
        const json = await apiFetch(endpoint, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (json.status !== 'success') {
            box.innerHTML = `<div style="color: var(--sharingan-red); text-align: center; padding-top: 50px;">${json.message}</div>`;
            return;
        }

        const report = json.data.battle;
        playBattleAnimation(report, json.message);
        loadUserProfile();
    } catch (e) {
        box.innerHTML = `<div style="color: var(--sharingan-red); text-align: center; padding-top: 50px;">Battle error: ${e.message}</div>`;
    }
}

function playBattleAnimation(report, resultMessage) {
    const box = document.getElementById('combatLogsBox');
    box.innerHTML = '';

    const f1 = report.fighter1_final;
    const f2 = report.fighter2_final;
    
    document.getElementById('fighter1Name').textContent = f1.name;
    document.getElementById('fighter2Name').textContent = f2.name;

    updateHpBar('f1', f1.max_hp, f1.max_hp);
    updateHpBar('f2', f2.max_hp, f2.max_hp);

    const logs = report.logs;
    let step = 0;

    const interval = setInterval(() => {
        if (step >= logs.length) {
            clearInterval(interval);
            const fin = document.createElement('div');
            fin.className = 'log-entry end';
            fin.textContent = resultMessage;
            box.appendChild(fin);
            box.scrollTop = box.scrollHeight;
            return;
        }

        const log = logs[step];
        const entry = document.createElement('div');
        entry.className = `log-entry ${log.type}`;
        entry.textContent = log.message;
        box.appendChild(entry);
        box.scrollTop = box.scrollHeight;

        // Animate HP Bar
        if (log.defender_hp_remaining !== undefined) {
            if (log.defender === f1.name) {
                updateHpBar('f1', log.defender_hp_remaining, log.defender_max_hp);
            } else {
                updateHpBar('f2', log.defender_hp_remaining, log.defender_max_hp);
            }
        }

        step++;
    }, 450);
}

function updateHpBar(who, current, max) {
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    const fill = document.getElementById(`${who}HpFill`);
    const text = document.getElementById(`${who}HpText`);
    if (fill) {
        fill.style.width = `${pct}%`;
        fill.className = `hp-bar-fill ${pct < 30 ? 'danger' : ''}`;
    }
    if (text) text.textContent = `${current}/${max}`;
}

// Packet Inspector Logs
async function loadPacketLogs() {
    try {
        const json = await apiFetch('inspector');
        const tbody = document.getElementById('packetLogsBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const logs = json.data.recent_packets;
        if (!logs || logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No packets captured yet. APK traffic will automatically appear here when connected!</td></tr>`;
            return;
        }

        logs.forEach(l => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${l.id}</td>
                <td><span style="color: var(--rasengan-cyan); font-weight: bold;">${l.method}</span></td>
                <td><code>${l.endpoint}</code></td>
                <td>${l.ip_address}</td>
                <td>${l.created_at}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Failed to load packet logs:", e);
    }
}


// ==========================================
// AUTHENTIC SHINOBI CODEX CONTROLLER
// ==========================================
let currentCodexCat = 'ninjas';
let codexCache = {};
let codexSearchTimeout = null;

async function loadCodexData() {
    loadCodexStats();
    switchCodexCategory(currentCodexCat);
}

async function loadCodexStats() {
    try {
        const json = await apiFetch('codex/list.php?category=stats');
        if (json.status === 'success') {
            const s = json.data;
            const container = document.getElementById('codexStatsBadges');
            if (!container) return;
            container.innerHTML = `
                <span class="currency-badge" style="background: rgba(255, 119, 0, 0.2); border-color: rgba(255, 119, 0, 0.4); color: #fff;">
                    <i class="fa-solid fa-user-ninja" style="color: var(--chakra-orange);"></i> ${s.total_ninjas} Ninjas
                </span>
                <span class="currency-badge" style="background: rgba(168, 85, 247, 0.2); border-color: rgba(168, 85, 247, 0.4); color: #fff;">
                    <i class="fa-solid fa-fire" style="color: #a855f7;"></i> ${s.total_jutsus} Jutsus
                </span>
                <span class="currency-badge" style="background: rgba(0, 229, 255, 0.2); border-color: rgba(0, 229, 255, 0.4); color: #fff;">
                    <i class="fa-solid fa-dungeon" style="color: var(--chakra-cyan);"></i> ${s.total_exams} Floors
                </span>
                <span class="currency-badge" style="background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); color: #fff;">
                    <i class="fa-solid fa-dragon" style="color: #ef4444;"></i> ${s.total_beasts} Bijuu
                </span>
                <span class="currency-badge" style="background: rgba(234, 179, 8, 0.2); border-color: rgba(234, 179, 8, 0.4); color: #fff;">
                    <i class="fa-solid fa-box" style="color: #eab308;"></i> ${s.total_items} Items
                </span>
            `;
        }
    } catch (e) {
        console.error("Failed to load codex stats:", e);
    }
}

function switchCodexCategory(cat) {
    currentCodexCat = cat;
    document.querySelectorAll('.codex-cat-btn').forEach(b => {
        b.classList.remove('btn-primary', 'active');
        b.classList.add('btn-secondary');
        if (b.dataset.cat === cat) {
            b.classList.remove('btn-secondary');
            b.classList.add('btn-primary', 'active');
        }
    });

    // Show/hide grade filter based on category
    const gradeSelect = document.getElementById('codexGradeFilter');
    if (gradeSelect) {
        gradeSelect.style.display = (cat === 'ninjas' || cat === 'jutsus') ? 'inline-block' : 'none';
        gradeSelect.value = '';
    }

    const searchInput = document.getElementById('codexSearchInput');
    if (searchInput) searchInput.value = '';

    fetchAndRenderCodex();
}

function filterCodex() {
    clearTimeout(codexSearchTimeout);
    codexSearchTimeout = setTimeout(() => {
        fetchAndRenderCodex();
    }, 250);
}

async function fetchAndRenderCodex() {
    const grid = document.getElementById('codexGrid');
    if (!grid) return;
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;"><i class="fa-solid fa-circle-notch fa-spin fa-2x"></i><br><br>Loading authentic data...</div>`;

    const grade = document.getElementById('codexGradeFilter') ? document.getElementById('codexGradeFilter').value : '';
    const search = document.getElementById('codexSearchInput') ? document.getElementById('codexSearchInput').value.trim() : '';

    let url = `codex/list.php?category=${currentCodexCat}`;
    if (grade) url += `&grade=${encodeURIComponent(grade)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    try {
        const json = await apiFetch(url);
        if (json.status !== 'success') {
            grid.innerHTML = `<div style="grid-column: 1/-1; color: var(--sharingan-red); text-align: center;">Error loading codex: ${json.message}</div>`;
            return;
        }

        const records = json.data.records || [];
        if (records.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; color: var(--text-muted); text-align: center; padding: 2rem;">No matching authentic records found.</div>`;
            return;
        }

        switch (currentCodexCat) {
            case 'ninjas':
                renderCodexNinjas(records);
                break;
            case 'jutsus':
                renderCodexJutsus(records);
                break;
            case 'exams':
                renderCodexExams(records);
                break;
            case 'beasts':
                renderCodexBeasts(records);
                break;
            case 'items':
                renderCodexItems(records);
                break;
        }
    } catch (e) {
        grid.innerHTML = `<div style="grid-column: 1/-1; color: var(--sharingan-red); text-align: center;">Failed to load authentic data: ${e.message}</div>`;
    }
}

function renderCodexNinjas(list) {
    window.currentCodexNinjas = list;
    const grid = document.getElementById('codexGrid');
    grid.className = 'ninja-grid ninja-portrait-grid';
    grid.innerHTML = list.map((n, i) => `
        <div class="ninja-portrait-card grade-${n.grade}" onclick="showNinjaDetailModal(${i})" title="Klik untuk info detail & lore ${n.name}">
            <div class="card-grade-badge">${n.grade}</div>
            <div class="card-avatar-frame">
                <img src="images/ninja_heads/${n.xmlfile || 'mingren'}_h.png" alt="${n.name}" onerror="this.onerror=null;this.src='images/ninja_heads/mingren_h.png';">
            </div>
            <div class="card-ninja-name" title="${n.name}">${n.name}</div>
            <div class="card-stats-grid">
                <div class="stat-col"><span class="stat-lbl">ATK</span> <span class="stat-num">${Number(n.base_atk).toLocaleString('en-US')}</span></div>
                <div class="stat-col right"><span class="stat-lbl">DEF</span> <span class="stat-num">${Number(n.base_def).toLocaleString('en-US')}</span></div>
                <div class="stat-col"><span class="stat-lbl">HP</span> <span class="stat-num">${Number(n.base_hp).toLocaleString('en-US')}</span></div>
                <div class="stat-col right"><span class="stat-lbl">AGI</span> <span class="stat-num">${Number(n.base_speed).toLocaleString('en-US')}</span></div>
            </div>
        </div>
    `).join('');
}

function showNinjaDetailModal(index) {
    const list = window.currentCodexNinjas || [];
    const n = list[index];
    if (!n) return;

    const content = document.getElementById('ninjaDetailContent');
    const gradeColor = getGradeColor(n.grade);
    content.innerHTML = `
        <div style="display: flex; gap: 16px; align-items: flex-start; margin-bottom: 1.2rem;">
            <div class="card-avatar-frame" style="width: 104px; height: 104px; margin: 0; flex-shrink: 0; border: 2px solid ${gradeColor}; border-radius: 6px;">
                <img src="images/ninja_heads/${n.xmlfile || 'mingren'}_h.png" alt="${n.name}" onerror="this.onerror=null;this.src='images/ninja_heads/mingren_h.png';">
            </div>
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <span class="badge-grade grade-${n.grade}" style="font-size: 0.8rem; padding: 2px 10px;">${n.grade}</span>
                    <span style="font-size: 0.85rem; color: var(--chakra-cyan); font-weight: 700;">[${n.element || 'Neutral'}]</span>
                </div>
                <h3 style="color: #fff; font-size: 1.35rem; margin: 0 0 6px 0; font-family: var(--font-title);">${n.name}</h3>
                <div style="font-size: 0.82rem; color: #94a3b8;">Sprite ID: <code style="color: #38bdf8;">${n.xmlfile || 'default'}</code></div>
                <div style="font-size: 0.82rem; color: #94a3b8;">Quality Rank: <strong style="color: #ffd700;">Tier ${n.quality || 1}</strong></div>
            </div>
        </div>

        <div style="background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 14px; margin-bottom: 1.2rem;">
            <div style="font-size: 0.74rem; text-transform: uppercase; color: #64748b; font-weight: 800; margin-bottom: 10px; letter-spacing: 0.5px;">Authentic In-Game Base Stats</div>
            <div class="card-stats-grid" style="font-size: 0.95rem; row-gap: 8px;">
                <div class="stat-col"><span class="stat-lbl" style="font-size: 0.82rem;">ATK:</span> <span class="stat-num" style="font-size: 1rem; color: #fff;">${Number(n.base_atk).toLocaleString('en-US')}</span></div>
                <div class="stat-col right"><span class="stat-lbl" style="font-size: 0.82rem;">DEF:</span> <span class="stat-num" style="font-size: 1rem; color: #fff;">${Number(n.base_def).toLocaleString('en-US')}</span></div>
                <div class="stat-col"><span class="stat-lbl" style="font-size: 0.82rem;">HP:</span> <span class="stat-num" style="font-size: 1rem; color: #fff;">${Number(n.base_hp).toLocaleString('en-US')}</span></div>
                <div class="stat-col right"><span class="stat-lbl" style="font-size: 0.82rem;">AGI:</span> <span class="stat-num" style="font-size: 1rem; color: #fff;">${Number(n.base_speed).toLocaleString('en-US')}</span></div>
            </div>
        </div>

        <div style="margin-bottom: 1.4rem;">
            <div style="font-size: 0.74rem; text-transform: uppercase; color: #64748b; font-weight: 800; margin-bottom: 6px; letter-spacing: 0.5px;">Shinobi Lore & Official Bio</div>
            <p style="font-size: 0.88rem; color: #cbd5e1; line-height: 1.6; margin: 0; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                ${n.description ? n.description : 'Official authentic ninja character extracted directly from APK Role.js'}
            </p>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button class="btn btn-secondary" onclick="closeModal('ninjaDetailModal')" style="padding: 8px 24px;">Tutup</button>
        </div>
    `;
    openModal('ninjaDetailModal');
}

function getGradeColor(grade) {
    switch (grade) {
        case 'UR': return '#b5851d';
        case 'SSS': return '#8b5cf6';
        case 'SS': return '#ef4444';
        case 'S': return '#f97316';
        case 'A': return '#3b82f6';
        case 'B': return '#10b981';
        case 'C': return '#64748b';
        case 'D': return '#475569';
        default: return '#94a3b8';
    }
}

function renderCodexJutsus(list) {
    const grid = document.getElementById('codexGrid');
    grid.className = 'ninja-grid ninja-portrait-grid';
    grid.innerHTML = list.map(j => `
        <div class="jutsu-portrait-card">
            <div class="card-grade-badge" style="background: var(--grade-${j.grade.toLowerCase()}, #3b82f6); color: #fff;">${j.grade}</div>
            <div class="card-avatar-frame" style="border-radius: 8px; border-color: rgba(255, 145, 0, 0.45);">
                <img src="images/skills/${j.icon || 'skill_001'}.png" alt="${j.name}" onerror="this.onerror=null;this.src='images/skills/skill_001.png';">
            </div>
            <div class="card-ninja-name" style="color: #ff9100;" title="${j.name}">${j.name}</div>
            <div style="font-size: 0.74rem; color: #94a3b8; text-align: center; margin-bottom: 8px;">${j.category} • [${j.element}]</div>
            <div class="card-stats-grid">
                <div class="stat-col"><span class="stat-lbl">DMG</span> <span class="stat-num" style="color: #ff5252;">${j.desc_dmg || '100%'}</span></div>
                <div class="stat-col right"><span class="stat-lbl">RATE</span> <span class="stat-num" style="color: var(--chakra-cyan);">${j.probability}%</span></div>
            </div>
        </div>
    `).join('');
}

function renderCodexExams(list) {
    const grid = document.getElementById('codexGrid');
    grid.className = 'ninja-grid ninja-portrait-grid';
    grid.innerHTML = list.map(e => `
        <div class="ninja-portrait-card grade-${e.enemy_grade}">
            <div class="card-grade-badge">F${e.floor}</div>
            <div class="card-avatar-frame">
                <img src="images/ninja_heads/${e.xmlfile || 'mingren'}_h.png" alt="${e.enemy_name}" onerror="this.onerror=null;this.src='images/ninja_heads/mingren_h.png';">
            </div>
            <div class="card-ninja-name" title="${e.enemy_name}">${e.enemy_name}</div>
            <div style="font-size: 0.74rem; color: #94a3b8; text-align: center; margin-bottom: 6px;">Lv. ${e.enemy_level} • [${e.element}]</div>
            <div class="card-stats-grid">
                <div class="stat-col"><span class="stat-lbl">SILVER</span> <span class="stat-num" style="color: #ffd700;">+${parseInt(e.reward_silver).toLocaleString()}</span></div>
                <div class="stat-col right"><span class="stat-lbl">EXP</span> <span class="stat-num" style="color: var(--chakra-cyan);">+${e.reward_exp}</span></div>
            </div>
        </div>
    `).join('');
}

function renderCodexBeasts(list) {
    const grid = document.getElementById('codexGrid');
    grid.className = 'ninja-grid';
    grid.innerHTML = list.map(b => `
        <div class="ninja-portrait-card grade-UR" style="border-color: rgba(239, 68, 68, 0.45);">
            <div class="card-grade-badge" style="background: #dc2626; color: #fff;">${b.num_tails}T</div>
            <div class="card-avatar-frame" style="border-color: #ef4444; border-radius: 8px;">
                <img src="images/items/${b.icon || 'prop_001'}.png" alt="${b.name}" onerror="this.onerror=null;this.src='images/ninja_heads/mingren_h.png';">
            </div>
            <div class="card-ninja-name" style="color: #ff3366;" title="${b.name}">${b.name}</div>
            <div style="font-size: 0.74rem; color: #94a3b8; text-align: center; margin-bottom: 6px;">Tailed Beast Lv. ${b.level}</div>
            <div class="card-stats-grid">
                <div class="stat-col"><span class="stat-lbl">COST</span> <span class="stat-num">${b.cost} STM</span></div>
                <div class="stat-col right"><span class="stat-lbl">CHAINS</span> <span class="stat-num" style="color: var(--chakra-cyan);">${b.skills}</span></div>
            </div>
        </div>
    `).join('');
}

function renderCodexItems(list) {
    const grid = document.getElementById('codexGrid');
    grid.className = 'ninja-grid ninja-portrait-grid';
    grid.innerHTML = list.map(it => `
        <div class="item-portrait-card">
            <div class="card-grade-badge" style="background: #475569; color: #fff;">Q${it.quality}</div>
            <div class="card-avatar-frame" style="border-radius: 8px; border-color: rgba(0, 210, 255, 0.4);">
                <img src="images/items/${it.icon || 'acc_001'}.png" alt="${it.name}" onerror="this.onerror=null;this.src='images/items/acc_001.png';">
            </div>
            <div class="card-ninja-name" title="${it.name}">${it.name}</div>
            <div style="font-size: 0.74rem; color: #ffd700; text-align: center; margin-bottom: 6px;">${it.sell_price ? it.sell_price + ' Silver' : 'Special'}</div>
            <div class="card-stats-grid">
                <div class="stat-col"><span class="stat-lbl">REQ</span> <span class="stat-num">Lv.${it.level_req}</span></div>
                <div class="stat-col right"><span class="stat-lbl">MAX</span> <span class="stat-num">${it.stack_max}</span></div>
            </div>
        </div>
    `).join('');
}

/* ==========================================================================
   AUTHENTICATION & SESSION CONTROLLER
   ========================================================================== */

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

function showAuthModal() {
    openModal('authModal');
}

function hideAuthModal() {
    closeModal('authModal');
}

async function performLogin() {
    const user = document.getElementById('authUsername').value.trim();
    const pass = document.getElementById('authPassword').value.trim();
    if (!user || !pass) return alert('Masukkan username dan password.');

    try {
        const json = await apiFetch('auth/login.php', {
            method: 'POST',
            body: JSON.stringify({ username: user, password: pass })
        });
        if (json.status === 'success') {
            authToken = json.data.token;
            localStorage.setItem('ninja_token', authToken);
            currentUser = json.data.user;
            hideAuthModal();
            closeModal('gmAccessRequiredModal');
            updateTopBar(currentUser, json.data.main_ninja);
            if (currentUser && currentUser.role === 'admin') {
                activateTab('gm-console');
                showToast(`👑 Selamat datang Game Master ${user}!`, 'gm');
            } else {
                activateTab('hut');
                showToast(`🍥 Selamat datang kembali, Shinobi ${user}!`);
            }
            loadNinjaInventory();
        } else {
            alert(json.message);
        }
    } catch (e) {
        alert("Login gagal: " + e.message);
    }
}

async function performRegister() {
    const user = document.getElementById('authUsername').value.trim();
    const pass = document.getElementById('authPassword').value.trim();
    if (!user || !pass) return alert('Masukkan username dan password.');

    try {
        const json = await apiFetch('auth/register.php', {
            method: 'POST',
            body: JSON.stringify({ username: user, password: pass })
        });
        if (json.status === 'success') {
            authToken = json.data.token;
            localStorage.setItem('ninja_token', authToken);
            currentUser = json.data.user;
            hideAuthModal();
            closeModal('gmAccessRequiredModal');
            updateTopBar(currentUser, json.data.main_ninja);
            activateTab('hut');
            showToast(`🍥 Akun baru [${user}] siap bertarung di desa!`);
            loadNinjaInventory();
        } else {
            alert(json.message);
        }
    } catch (e) {
        alert("Registrasi gagal: " + e.message);
    }
}

async function autoGuestLogin() {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const guestUser = `shinobi_${rand}`;
    const guestPass = '123456';

    try {
        const json = await apiFetch('auth/register.php', {
            method: 'POST',
            body: JSON.stringify({ username: guestUser, password: guestPass })
        });
        if (json.status === 'success') {
            authToken = json.data.token;
            localStorage.setItem('ninja_token', authToken);
            currentUser = json.data.user;
            hideAuthModal();
            closeModal('gmAccessRequiredModal');
            updateTopBar(currentUser, json.data.main_ninja);
            activateTab('hut');
            showToast(`🍥 Masuk sebagai Player [${guestUser}]!`);
            loadNinjaInventory();
        } else {
            alert(json.message);
        }
    } catch (e) {
        alert("Demo Shinobi gagal: " + e.message);
    }
}

async function quickPlayerLogin() {
    const demoPlayer = 'shinobi_demo';
    const demoPass = 'ninja123';

    try {
        let json = await apiFetch('auth/login.php', {
            method: 'POST',
            body: JSON.stringify({ username: demoPlayer, password: demoPass })
        });

        if (json.status !== 'success') {
            json = await apiFetch('auth/register.php', {
                method: 'POST',
                body: JSON.stringify({ username: demoPlayer, password: demoPass })
            });
        }

        if (json.status === 'success') {
            authToken = json.data.token || (json.data.user && json.data.user.token);
            localStorage.setItem('ninja_token', authToken);
            currentUser = json.data.user || { username: demoPlayer, role: 'user', silver: 50000, gold: 500, stamina: 100, level: 1 };
            
            hideAuthModal();
            closeModal('gmAccessRequiredModal');
            
            updateTopBar(currentUser, json.data.main_ninja);
            activateTab('hut');
            showToast('🍥 Beralih ke Mode Shinobi Player!');
            loadNinjaInventory();
        } else {
            autoGuestLogin();
        }
    } catch (e) {
        autoGuestLogin();
    }
}

async function quickAdminLogin() {
    try {
        const json = await apiFetch('auth/login.php', {
            method: 'POST',
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        if (json.status === 'success') {
            authToken = json.data.token;
            localStorage.setItem('ninja_token', authToken);
            currentUser = json.data.user;
            currentUser.role = 'admin';
            
            hideAuthModal();
            closeModal('gmAccessRequiredModal');
            
            updateTopBar(currentUser, json.data.main_ninja);
            activateTab('gm-console');
            showToast('👑 Mode Game Master Aktif! Konsol server dibuka.', 'gm');
            loadNinjaInventory();
        } else {
            alert(json.message);
        }
    } catch (e) {
        alert("Admin Login gagal: " + e.message);
    }
}

async function loginAsPlayer(userId, username) {
    if (!confirm(`Beralih session dan login ke akun [${username}]?`)) return;
    try {
        const json = await apiFetch('admin/manage_player.php', {
            method: 'POST',
            body: JSON.stringify({ action: 'login_as', user_id: userId })
        });
        if (json.status === 'success' && json.data.token) {
            authToken = json.data.token;
            localStorage.setItem('ninja_token', authToken);
            await loadUserProfile();
            await loadNinjaInventory();
            activateTab('inventory');
            showToast(`Sekarang login sebagai: ${username}`);
        } else {
            alert(json.message);
        }
    } catch (e) {
        alert("Gagal beralih akun: " + e.message);
    }
}

function showToast(message, type = 'info') {
    let toast = document.getElementById('appToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'appToast';
        toast.className = 'app-toast';
        document.body.appendChild(toast);
    }
    toast.innerHTML = message;
    toast.className = `app-toast active ${type}`;
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.remove('active');
    }, 3500);
}

function logout() {
    localStorage.removeItem('ninja_token');
    authToken = '';
    currentUser = null;
    document.getElementById('displayUsername').textContent = 'Guest';
    document.getElementById('userRoleBadge').style.display = 'none';
    const btnGM = document.getElementById('btnSwitchToGM');
    const btnPlayer = document.getElementById('btnSwitchToPlayer');
    if (btnGM) btnGM.style.display = 'inline-flex';
    if (btnPlayer) btnPlayer.style.display = 'none';
    showAuthModal();
}

/* ==========================================================================
   ANNOUNCEMENT BANNER
   ========================================================================== */

async function loadServerAnnouncement() {
    try {
        const json = await apiFetch('admin/notice.php');
        if (json.status === 'success' && json.data) {
            const banner = document.getElementById('serverNoticeBanner');
            const titleEl = document.getElementById('bannerNoticeTitle');
            const textEl = document.getElementById('bannerNoticeText');
            if (banner && json.data.content) {
                if (titleEl) titleEl.textContent = json.data.title || 'INFO SERVER';
                if (textEl) textEl.textContent = json.data.content;
                banner.style.display = 'flex';
            }
        }
    } catch (e) {
        // Silently ignore if not reachable
    }
}

/* ==========================================================================
   GAME MASTER (GM) CONSOLE CONTROLLER
   ========================================================================== */

let gmCurrentTab = 'overview';
let gmPlayersList = [];
let gmAllNinjasList = [];
let gmPlayerFilter = 'all';

async function loadGmConsole() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Akses khusus Game Master (Admin).');
        return;
    }
    switchGmTab(gmCurrentTab);
    populateGmNinjaSelect();
}

function refreshGmConsole() {
    switchGmTab(gmCurrentTab);
}

function switchGmTab(tabName) {
    gmCurrentTab = tabName;
    document.querySelectorAll('.gm-sub-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.gmtab === tabName);
    });
    document.querySelectorAll('.gm-sub-pane').forEach(p => {
        p.style.display = 'none';
    });
    const activePane = document.getElementById(`gm-pane-${tabName}`);
    if (activePane) activePane.style.display = 'block';

    if (tabName === 'overview') loadGmStats();
    if (tabName === 'players') loadGmPlayers();
    if (tabName === 'rewards') {
        populateGmPlayerSelect();
        populateGmNinjaSelect();
    }
    if (tabName === 'notices') loadGmNoticeEditor();
    if (tabName === 'inspector') loadPacketLogs();
}

async function loadGmStats() {
    try {
        const json = await apiFetch('admin/stats.php');
        if (json.status === 'success') {
            const s = json.data;
            document.getElementById('gmStatTotalPlayers').textContent = s.total_players.toLocaleString();
            document.getElementById('gmStatGoldCirculation').textContent = s.total_gold_circulation.toLocaleString();
            document.getElementById('gmStatSilverCirculation').textContent = s.total_silver_circulation.toLocaleString();
            document.getElementById('gmStatBannedPlayers').textContent = s.banned_players.toLocaleString();
            document.getElementById('gmStatLegendaryNinjas').textContent = s.total_legendary_ninjas.toLocaleString();
        }
    } catch (e) {
        console.error("Failed to load GM stats:", e);
    }
}

async function submitMassAirDrop() {
    const silver = parseInt(document.getElementById('gmMassSilver').value) || 0;
    const gold = parseInt(document.getElementById('gmMassGold').value) || 0;
    const stamina = parseInt(document.getElementById('gmMassStamina').value) || 0;

    if (!confirm(`Konfirmasi pembagian AIR DROP ke SEMUA pemain:\n• Silver: +${silver.toLocaleString()}\n• Gold: +${gold.toLocaleString()}\n• Stamina: +${stamina}\n\nLanjutkan?`)) {
        return;
    }

    try {
        const json = await apiFetch('admin/send_reward.php', {
            method: 'POST',
            body: JSON.stringify({
                target_all: true,
                reward_type: 'currency',
                silver, gold, stamina
            })
        });
        alert(json.data.message || 'Air drop berhasil dikirim!');
        loadGmStats();
        loadUserProfile();
    } catch (e) {
        alert("Gagal kirim air drop: " + e.message);
    }
}

async function loadGmPlayers() {
    const body = document.getElementById('gmPlayersTableBody');
    if (!body) return;
    body.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat daftar pemain...</td></tr>`;

    try {
        const json = await apiFetch(`admin/players.php?filter=${gmPlayerFilter}`);
        if (json.status === 'success') {
            gmPlayersList = json.data.players;
            renderGmPlayersTable(gmPlayersList);
            populateGmPlayerSelect();
        } else {
            body.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--sharingan-red); padding: 2rem;">Error: ${json.message}</td></tr>`;
        }
    } catch (e) {
        body.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--sharingan-red); padding: 2rem;">Error memuat pemain: ${e.message}</td></tr>`;
    }
}

function filterGmPlayers(filter) {
    gmPlayerFilter = filter;
    document.querySelectorAll('.gm-player-filter-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === filter);
        b.classList.toggle('btn-primary', b.dataset.filter === filter);
        b.classList.toggle('btn-secondary', b.dataset.filter !== filter);
    });
    loadGmPlayers();
}

function searchGmPlayers() {
    const query = document.getElementById('gmPlayerSearchInput').value.toLowerCase().trim();
    if (!query) {
        renderGmPlayersTable(gmPlayersList);
        return;
    }
    const filtered = gmPlayersList.filter(p => p.username.toLowerCase().includes(query));
    renderGmPlayersTable(filtered);
}

function renderGmPlayersTable(players) {
    const body = document.getElementById('gmPlayersTableBody');
    if (!body) return;

    if (players.length === 0) {
        body.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">Tidak ada pemain ditemukan.</td></tr>`;
        return;
    }

    body.innerHTML = players.map(p => {
        const isBanned = (p.is_banned == 1);
        const isAdmin = (p.role === 'admin');

        return `
            <tr>
                <td><code style="color: #94a3b8;">#${p.id}</code></td>
                <td>
                    <a href="javascript:void(0)" onclick="loginAsPlayer(${p.id}, '${p.username}')" style="color: #fff; text-decoration: none; font-weight: 700; display: inline-flex; align-items: center; gap: 5px;" title="Klik untuk switch login ke akun ini">
                        <span>${p.username}</span>
                        <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.7rem; color: var(--chakra-cyan);"></i>
                    </a>
                    ${isBanned ? `<div style="font-size: 0.72rem; color: #ef4444; margin-top: 2px;">Alasan: ${p.ban_reason || 'Banned'}</div>` : ''}
                </td>
                <td>
                    <span class="chip ${isAdmin ? 'chip-admin' : 'chip-user'}">${isAdmin ? '👑 ADMIN' : 'PLAYER'}</span>
                </td>
                <td>
                    <span class="chip ${isBanned ? 'chip-banned' : 'chip-active'}">${isBanned ? '🚫 BANNED' : '🟢 ACTIVE'}</span>
                </td>
                <td>
                    <span style="font-weight: 700; color: #fff;">Lv. ${p.level}</span>
                    <span style="color: #fbbf24; font-size: 0.75rem; margin-left: 4px;">VIP ${p.vip_level}</span>
                </td>
                <td>
                    <div style="color: #ffd700; font-size: 0.8rem;"><i class="fa-solid fa-gem"></i> ${parseInt(p.gold).toLocaleString()}</div>
                    <div style="color: #cbd5e1; font-size: 0.8rem;"><i class="fa-solid fa-coins"></i> ${parseInt(p.silver).toLocaleString()}</div>
                </td>
                <td>
                    ${p.main_ninja_name ? `
                        <span class="badge-grade grade-${p.main_ninja_grade}" style="font-size: 0.65rem; padding: 2px 6px;">${p.main_ninja_grade}</span>
                        <span style="color: #fff; font-size: 0.82rem;">${p.main_ninja_name}</span>
                    ` : '<span style="color: var(--text-muted); font-size: 0.78rem;">Belum deploy</span>'}
                </td>
                <td>
                    <span style="color: var(--chakra-cyan); font-weight: 700;">${p.ninja_count || 0}</span> <span style="font-size: 0.72rem; color: var(--text-muted);">ninja</span>
                </td>
                <td>
                    <div class="btn-action-group">
                        <button onclick="loginAsPlayer(${p.id}, '${p.username}')" class="btn-mini btn-mini-login" title="Login Sebagai Akun Ini">
                            <i class="fa-solid fa-right-to-bracket"></i> Login
                        </button>
                        <button onclick="quickRewardToPlayer(${p.id}, '${p.username}')" class="btn-mini btn-mini-reward" title="Kirim Hadiah">
                            <i class="fa-solid fa-gift"></i> Hadiah
                        </button>
                        <button onclick="openGmEditStatsModal(${p.id})" class="btn-mini btn-mini-edit" title="Edit Stats">
                            <i class="fa-solid fa-pen"></i> Edit
                        </button>
                        ${isBanned ? `
                            <button onclick="toggleBanPlayer(${p.id}, '${p.username}', true)" class="btn-mini btn-mini-unban" title="Buka Ban">
                                <i class="fa-solid fa-user-check"></i> Unban
                            </button>
                        ` : `
                            <button onclick="toggleBanPlayer(${p.id}, '${p.username}', false)" class="btn-mini btn-mini-ban" title="Ban Pemain">
                                <i class="fa-solid fa-user-slash"></i> Ban
                            </button>
                        `}
                        <button onclick="togglePlayerRole(${p.id}, '${p.username}', '${p.role}')" class="btn-mini btn-secondary" style="font-size: 0.7rem;" title="Ubah Role">
                            <i class="fa-solid fa-crown"></i> ${isAdmin ? 'Jadikan User' : 'Jadikan GM'}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Quick Reward shortcut from Table to Injector Tab
function quickRewardToPlayer(userId, username) {
    switchGmTab('rewards');
    const select = document.getElementById('gmInjectorPlayerSelect');
    if (select) {
        select.value = userId;
    }
}

function switchInjectorType(type) {
    document.querySelectorAll('.gm-inj-type-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.type === type);
        b.classList.toggle('btn-primary', b.dataset.type === type);
        b.classList.toggle('btn-secondary', b.dataset.type !== type);
    });

    document.getElementById('gmInjCurrencySection').style.display = (type === 'currency' ? 'block' : 'none');
    document.getElementById('gmInjNinjaSection').style.display = (type === 'ninja' ? 'block' : 'none');
    document.getElementById('gmInjVipSection').style.display = (type === 'vip' ? 'block' : 'none');
}

async function populateGmNinjaSelect() {
    const select = document.getElementById('gmInjNinjaSelect');
    if (!select || select.options.length > 0) return;

    try {
        const json = await apiFetch('codex/list.php?category=ninjas');
        if (json.status === 'success') {
            gmAllNinjasList = json.data.records;
            select.innerHTML = gmAllNinjasList.map(n => `
                <option value="${n.id}">[${n.grade}] ${n.name} (Chakra: ${n.element || 'None'} • Base HP: ${n.base_hp})</option>
            `).join('');
        }
    } catch (e) {
        console.error("Failed to populate ninjas for injector:", e);
    }
}

function populateGmPlayerSelect() {
    const select = document.getElementById('gmInjectorPlayerSelect');
    if (!select) return;
    if (gmPlayersList.length === 0) return;

    select.innerHTML = gmPlayersList.map(p => `
        <option value="${p.id}">#${p.id} - ${p.username} (Lv. ${p.level} • Role: ${p.role.toUpperCase()})</option>
    `).join('');
}

async function submitGmInjector() {
    const targetUserId = parseInt(document.getElementById('gmInjectorPlayerSelect').value);
    if (!targetUserId) return alert('Pilih pemain tujuan.');

    const activeBtn = document.querySelector('.gm-inj-type-btn.active');
    const type = activeBtn ? activeBtn.dataset.type : 'currency';

    let payload = {
        user_id: targetUserId,
        reward_type: type
    };

    if (type === 'currency') {
        payload.gold = parseInt(document.getElementById('gmInjGold').value) || 0;
        payload.silver = parseInt(document.getElementById('gmInjSilver').value) || 0;
        payload.stamina = parseInt(document.getElementById('gmInjStamina').value) || 0;
    } else if (type === 'ninja') {
        payload.ninja_id = parseInt(document.getElementById('gmInjNinjaSelect').value);
        payload.level = parseInt(document.getElementById('gmInjNinjaLevel').value) || 1;
    } else if (type === 'vip') {
        payload.vip_level = parseInt(document.getElementById('gmInjVipLevel').value) || 0;
    }

    try {
        const json = await apiFetch('admin/send_reward.php', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        alert(json.data.message || 'Injeksi berhasil dieksekusi!');
        loadGmPlayers();
        loadGmStats();
        if (currentUser && currentUser.id === targetUserId) {
            loadUserProfile();
            loadNinjaInventory();
        }
    } catch (e) {
        alert("Gagal melakukan injeksi: " + e.message);
    }
}

async function toggleBanPlayer(userId, username, isCurrentlyBanned) {
    if (isCurrentlyBanned) {
        if (!confirm(`Batalkan BAN untuk pemain ${username}?`)) return;
        try {
            const json = await apiFetch('admin/manage_player.php', {
                method: 'POST',
                body: JSON.stringify({ action: 'unban', user_id: userId })
            });
            alert(json.data.message);
            loadGmPlayers();
            loadGmStats();
        } catch (e) {
            alert("Gagal unban: " + e.message);
        }
    } else {
        const reason = prompt(`Masukkan alasan BAN untuk pemain ${username}:`, "Melanggar peraturan Game / Server");
        if (reason === null) return;
        try {
            const json = await apiFetch('admin/manage_player.php', {
                method: 'POST',
                body: JSON.stringify({ action: 'ban', user_id: userId, reason })
            });
            alert(json.data.message);
            loadGmPlayers();
            loadGmStats();
        } catch (e) {
            alert("Gagal ban: " + e.message);
        }
    }
}

async function togglePlayerRole(userId, username, currentRole) {
    const nextRole = (currentRole === 'admin') ? 'user' : 'admin';
    if (!confirm(`Ubah role pemain ${username} dari [${currentRole.toUpperCase()}] menjadi [${nextRole.toUpperCase()}]?`)) return;

    try {
        const json = await apiFetch('admin/manage_player.php', {
            method: 'POST',
            body: JSON.stringify({ action: 'set_role', user_id: userId, role: nextRole })
        });
        alert(json.data.message);
        loadGmPlayers();
        loadGmStats();
    } catch (e) {
        alert("Gagal mengubah role: " + e.message);
    }
}

function openGmEditStatsModal(userId) {
    const player = gmPlayersList.find(p => p.id == userId);
    if (!player) return;

    document.getElementById('gmEditUserId').value = player.id;
    document.getElementById('gmEditPlayerName').textContent = `Akun: ${player.username} (#${player.id})`;
    document.getElementById('gmEditLevel').value = player.level;
    document.getElementById('gmEditVip').value = player.vip_level;
    document.getElementById('gmEditSilver').value = player.silver;
    document.getElementById('gmEditGold').value = player.gold;
    document.getElementById('gmEditStamina').value = player.stamina || 100;

    const modal = document.getElementById('gmEditModal');
    if (modal) modal.classList.add('active');
}

function closeGmEditModal() {
    const modal = document.getElementById('gmEditModal');
    if (modal) modal.classList.remove('active');
}

async function submitGmEditStats() {
    const userId = parseInt(document.getElementById('gmEditUserId').value);
    const level = parseInt(document.getElementById('gmEditLevel').value);
    const vip_level = parseInt(document.getElementById('gmEditVip').value);
    const silver = parseInt(document.getElementById('gmEditSilver').value);
    const gold = parseInt(document.getElementById('gmEditGold').value);
    const stamina = parseInt(document.getElementById('gmEditStamina').value);

    try {
        const json = await apiFetch('admin/manage_player.php', {
            method: 'POST',
            body: JSON.stringify({
                action: 'edit_stats',
                user_id: userId,
                level, vip_level, silver, gold, stamina
            })
        });
        alert(json.data.message);
        closeGmEditModal();
        loadGmPlayers();
        loadGmStats();
        if (currentUser && currentUser.id === userId) {
            loadUserProfile();
        }
    } catch (e) {
        alert("Gagal menyimpan perubahan: " + e.message);
    }
}

async function loadGmNoticeEditor() {
    try {
        const json = await apiFetch('admin/notice.php');
        if (json.status === 'success' && json.data) {
            const titleInput = document.getElementById('gmNoticeTitle');
            const contentInput = document.getElementById('gmNoticeContent');
            if (titleInput && json.data.title) titleInput.value = json.data.title;
            if (contentInput && json.data.content) contentInput.value = json.data.content;
        }
    } catch (e) {
        console.error("Failed to load notice for editor:", e);
    }
}

async function submitGmNotice() {
    const title = document.getElementById('gmNoticeTitle').value.trim();
    const content = document.getElementById('gmNoticeContent').value.trim();

    if (!title || !content) {
        return alert('Judul dan isi pengumuman tidak boleh kosong.');
    }

    try {
        const json = await apiFetch('admin/notice.php', {
            method: 'POST',
            body: JSON.stringify({ action: 'save', title, content })
        });
        alert(json.data.message || 'Pengumuman berhasil disiarkan!');
        loadServerAnnouncement();
    } catch (e) {
        alert("Gagal menyiarkan pengumuman: " + e.message);
    }
}


