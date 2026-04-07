const rarityColors = {
    5: '#f6c36a',
    4: '#d8a8ff',
    3: '#7fc7ff',
};

const canvas = document.getElementById('bg-canvas');
const context = canvas?.getContext('2d');
const particles = [];

function resizeCanvas() {
    if (!canvas || !context) {
        return;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particles.length = 0;
    for (let index = 0; index < 80; index += 1) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 1.8 + 0.25,
            velocity: Math.random() * 0.45 + 0.1,
        });
    }
}

function drawCanvas() {
    if (!canvas || !context) {
        return;
    }

    context.fillStyle = '#05070d';
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (const particle of particles) {
        context.beginPath();
        context.fillStyle = 'rgba(255,255,255,0.85)';
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
        particle.y += particle.velocity;
        if (particle.y > canvas.height) {
            particle.y = 0;
            particle.x = Math.random() * canvas.width;
        }
    }
    window.requestAnimationFrame(drawCanvas);
}

resizeCanvas();
drawCanvas();
window.addEventListener('resize', resizeCanvas);

const state = {
    activeResults: [],
    controller: null,
};

const cardsWrapper = document.getElementById('cards-wrapper');
const statusPill = document.getElementById('status-pill');
const resultCount = document.getElementById('result-count');
const loadingOverlay = document.getElementById('loading-overlay');
const modal = document.getElementById('detail-modal');
const cardTemplate = document.getElementById('card-template');
const categorySelect = document.getElementById('wish-category');

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function showStatus(message, tone = 'idle') {
    if (!statusPill) {
        return;
    }

    statusPill.textContent = message;
    const colorMap = {
        idle: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100',
        busy: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
        error: 'border-rose-300/20 bg-rose-300/10 text-rose-100',
    };
    statusPill.className = `rounded-full px-3 py-1 text-xs ${colorMap[tone] || colorMap.idle}`;
}

function setMeteorColor(rarity) {
    const color = rarityColors[rarity] || rarityColors[3];
    loadingOverlay?.style.setProperty('--meteor-color', color);
}

function rarityStars(rarity) {
    return '✦'.repeat(rarity);
}

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
    rarity.style.color = rarityColors[recipe.rarity] || '#ffffff';

    button.addEventListener('click', () => openModal(recipe));
    return { fragment, button };
}

function renderResults(recipes) {
    state.activeResults = recipes;
    cardsWrapper.innerHTML = '';
    resultCount.textContent = `${recipes.length} 张结果`;

    recipes.forEach((recipe, index) => {
        const { fragment, button } = buildCard(recipe, index);
        cardsWrapper.appendChild(fragment);
        window.setTimeout(() => {
            button.classList.add('revealed');
        }, 90 * index + 80);
    });
}

function openModal(recipe) {
    document.getElementById('detail-title').textContent = recipe.name;
    document.getElementById('detail-category').textContent = `${recipe.category} / ${recipe.rarity} 星`;
    document.getElementById('detail-description').textContent = recipe.description;
    document.getElementById('detail-rarity').innerHTML = Array.from({ length: recipe.rarity })
        .map(() => `<span style="color:${rarityColors[recipe.rarity] || '#fff'}">✦</span>`)
        .join('');
    document.getElementById('detail-hero').style.backgroundImage = `url('${recipe.img_url}')`;
    document.getElementById('detail-ingredients').innerHTML = recipe.ingredients
        .map((item) => `<span class="pill-tag">${escapeHtml(item)}</span>`)
        .join('');
    document.getElementById('detail-steps').innerHTML = recipe.steps
        .map((step, index) => `<li><span class="text-amber-200 mr-2">${index + 1}.</span>${escapeHtml(step)}</li>`)
        .join('');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

async function requestWish(count, category) {
    state.controller?.abort();
    state.controller = new AbortController();
    showStatus('正在帮你挑选', 'busy');

    try {
        const params = new URLSearchParams({ count: String(count) });
        if (category) {
            params.set('category', category);
        }

        const response = await fetch(`/api/v1/wish?${params.toString()}`, {
            signal: state.controller.signal,
            headers: { Accept: 'application/json' },
        });

        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload.detail || '抽奖请求失败');
        }
        return payload;
    } catch (error) {
        if (error.name === 'AbortError') {
            return null;
        }
        throw error;
    }
}

async function triggerWish(count) {
    loadingOverlay.classList.remove('hidden');
    try {
        const category = categorySelect?.value || '';
        const payload = await requestWish(count, category);
        if (!payload) {
            return;
        }
        const highest = Math.max(...payload.map((item) => item.rarity));
        setMeteorColor(highest);
        await new Promise((resolve) => window.setTimeout(resolve, 1180));
        renderResults(payload);
        showStatus(category ? `已为你挑好 ${category}` : '晚餐灵感已经准备好了', 'idle');
    } catch (error) {
        showStatus(error.message, 'error');
        cardsWrapper.innerHTML = `<div class="empty-state w-full">${error.message}</div>`;
        resultCount.textContent = '0 张结果';
    } finally {
        window.setTimeout(() => loadingOverlay.classList.add('hidden'), 40);
    }
}

document.querySelectorAll('.wish-trigger').forEach((button) => {
    button.addEventListener('click', async () => {
        const count = Number(button.dataset.count || '1');
        await triggerWish(count);
    });
});

document.getElementById('close-modal')?.addEventListener('click', closeModal);
modal?.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

cardsWrapper.innerHTML = '<div class="empty-state w-full">选一个分类，或者直接点按钮，让今晚的菜单轻松一点。</div>';
