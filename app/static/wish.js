const rarityColors = { 5: '#f6c36a', 4: '#d8a8ff', 3: '#7fc7ff' };

/* ── Canvas star background ── */
const canvas = document.getElementById('bg-canvas');
const ctx = canvas?.getContext('2d');
const particles = [];

function resizeCanvas() {
    if (!canvas || !ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particles.length = 0;
    for (let i = 0; i < 80; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.8 + 0.25,
            v: Math.random() * 0.45 + 0.1,
        });
    }
}
function drawCanvas() {
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        p.y += p.v;
        if (p.y > canvas.height) { p.y = 0; p.x = Math.random() * canvas.width; }
    }
    requestAnimationFrame(drawCanvas);
}
resizeCanvas();
drawCanvas();
window.addEventListener('resize', resizeCanvas);

/* ── Sound effects (Web Audio API) ── */
let audioCtx = null;
function playRevealSound() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.35);
    } catch { /* silent fallback */ }
}
function playConfirmSound() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [660, 880, 1100];
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.1 + 0.2);
            osc.start(audioCtx.currentTime + i * 0.1);
            osc.stop(audioCtx.currentTime + i * 0.1 + 0.2);
        });
    } catch { /* silent fallback */ }
}

/* ── State ── */
const state = {
    results: [],
    history: JSON.parse(localStorage.getItem('mgt_history') || '[]'),
    controller: null,
};

/* ── DOM refs ── */
const configView = document.getElementById('config-view');
const resultView = document.getElementById('result-view');
const cardsWrapper = document.getElementById('cards-wrapper');
const resultCount = document.getElementById('result-count');
const loadingOverlay = document.getElementById('loading-overlay');
const modal = document.getElementById('detail-modal');
const cardTemplate = document.getElementById('card-template');
const categorySelect = document.getElementById('wish-category');
const raritySelect = document.getElementById('wish-rarity');
const keywordInput = document.getElementById('wish-keyword');
const countSlider = document.getElementById('wish-count');
const countDisplay = document.getElementById('wish-count-display');
const historyPanel = document.getElementById('history-panel');
const historyList = document.getElementById('history-list');

/* ── Helpers ── */
function escapeHtml(v) {
    return String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function rarityStars(n) { return '✦'.repeat(n); }
function setMeteorColor(rarity) { loadingOverlay?.style.setProperty('--meteor-color', rarityColors[rarity] || rarityColors[3]); }

/* ── Views ── */
function showConfig() {
    configView.classList.remove('hidden');
    resultView.classList.add('hidden');
    document.body.style.overflow = '';
}
function showResults() {
    configView.classList.add('hidden');
    resultView.classList.remove('hidden');
    document.body.style.overflow = '';
    resultView.querySelector('.result-view-inner').scrollTop = 0;
}

/* ── History ── */
function saveHistory() {
    localStorage.setItem('mgt_history', JSON.stringify(state.history));
}
function renderHistory() {
    if (!state.history.length) {
        historyPanel.classList.add('hidden');
        return;
    }
    historyPanel.classList.remove('hidden');
    historyList.innerHTML = state.history.map((entry, idx) => `
        <div class="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3 text-sm">
            <div class="flex items-center justify-between gap-2">
                <span class="text-slate-400 text-xs">${escapeHtml(entry.time)}</span>
                <button type="button" data-remove-history="${idx}" class="text-xs text-slate-500 hover:text-rose-300">删除</button>
            </div>
            <div class="mt-1 flex flex-wrap gap-2">
                ${entry.items.map(name => `<span class="pill-tag text-xs">${escapeHtml(name)}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

/* ── Cards ── */
function buildCard(recipe, index) {
    const fragment = cardTemplate.content.cloneNode(true);
    const button = fragment.querySelector('.wish-card');
    const front = fragment.querySelector('.wish-card-front');
    const name = fragment.querySelector('[data-name]');
    const category = fragment.querySelector('[data-category]');
    const rarity = fragment.querySelector('[data-rarity]');

    button.dataset.index = String(index);
    front.style.backgroundImage = `linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.08)), url('${recipe.img_url}')`;
    front.dataset.rarity = String(recipe.rarity);
    name.textContent = recipe.name;
    category.textContent = recipe.category;
    rarity.textContent = rarityStars(recipe.rarity);
    rarity.style.color = rarityColors[recipe.rarity] || '#fff';

    button.addEventListener('click', () => openModal(recipe));
    return { fragment, button };
}

function renderResults(recipes) {
    state.results = recipes;
    cardsWrapper.innerHTML = '';
    resultCount.textContent = `${recipes.length} 道`;

    recipes.forEach((recipe, index) => {
        const { fragment, button } = buildCard(recipe, index);
        cardsWrapper.appendChild(fragment);
        setTimeout(() => {
            button.classList.add('revealed');
            playRevealSound();
        }, 90 * index + 80);
    });
}

/* ── Modal ── */
function openModal(recipe) {
    document.getElementById('detail-title').textContent = recipe.name;
    document.getElementById('detail-category').textContent = `${recipe.category} / ${recipe.rarity} 星`;
    document.getElementById('detail-rarity').innerHTML = Array.from({ length: recipe.rarity })
        .map(() => `<span style="color:${rarityColors[recipe.rarity] || '#fff'}">✦</span>`).join('');
    document.getElementById('detail-hero').style.backgroundImage = `url('${recipe.img_url}')`;
    document.getElementById('detail-keywords').innerHTML = (recipe.keywords || [])
        .map(k => `<span class="pill-tag">${escapeHtml(k)}</span>`).join('') || '<span class="text-sm text-slate-500">无</span>';
    document.getElementById('detail-ingredients').innerHTML = recipe.ingredients
        .map(item => `<span class="pill-tag">${escapeHtml(item)}</span>`).join('');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

/* ── API ── */
async function requestWish(count, category, keyword) {
    state.controller?.abort();
    state.controller = new AbortController();
    const params = new URLSearchParams({ count: String(count) });
    if (category) params.set('category', category);
    if (keyword) params.set('keyword', keyword);

    const res = await fetch(`/api/v1/wish?${params}`, { signal: state.controller.signal, headers: { Accept: 'application/json' } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '抽取失败');
    return data;
}

async function requestRecommend() {
    const res = await fetch('/api/v1/recommend', { headers: { Accept: 'application/json' } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || '获取推荐失败');
    return data;
}

/* ── Main actions ── */
async function triggerWish() {
    const count = Number(countSlider.value) || 1;
    const category = categorySelect.value || '';
    const keyword = keywordInput.value.trim() || '';

    loadingOverlay.classList.remove('hidden');
    try {
        const payload = await requestWish(count, category, keyword);
        if (!payload) return;
        const highest = Math.max(...payload.map(r => r.rarity));
        setMeteorColor(highest);
        await new Promise(r => setTimeout(r, 1180));
        showResults();
        renderResults(payload);
    } catch (err) {
        showConfig();
        alert(err.message);
    } finally {
        setTimeout(() => loadingOverlay.classList.add('hidden'), 40);
    }
}

async function triggerRecommend() {
    loadingOverlay.classList.remove('hidden');
    try {
        const payload = await requestRecommend();
        if (!payload.length) { alert('还没有菜谱数据'); return; }
        const highest = Math.max(...payload.map(r => r.rarity));
        setMeteorColor(highest);
        await new Promise(r => setTimeout(r, 800));
        showResults();
        renderResults(payload);
    } catch (err) {
        alert(err.message);
    } finally {
        setTimeout(() => loadingOverlay.classList.add('hidden'), 40);
    }
}

/* ── Events ── */
countSlider.addEventListener('input', () => {
    countDisplay.textContent = countSlider.value;
});

document.getElementById('wish-go').addEventListener('click', triggerWish);
document.getElementById('show-recommend').addEventListener('click', triggerRecommend);
document.getElementById('back-to-config').addEventListener('click', showConfig);

document.getElementById('confirm-selection').addEventListener('click', () => {
    if (!state.results.length) return;
    playConfirmSound();
    const entry = {
        time: new Date().toLocaleString('zh-CN'),
        items: state.results.map(r => r.name),
    };
    state.history.unshift(entry);
    if (state.history.length > 50) state.history.length = 50;
    saveHistory();
    renderHistory();
    showConfig();
});

document.getElementById('clear-history')?.addEventListener('click', () => {
    state.history = [];
    saveHistory();
    renderHistory();
});

historyList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-history]');
    if (!btn) return;
    const idx = Number(btn.dataset.removeHistory);
    state.history.splice(idx, 1);
    saveHistory();
    renderHistory();
});

document.getElementById('close-modal')?.addEventListener('click', closeModal);
modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

/* ── Init ── */
renderHistory();
