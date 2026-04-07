const rowTemplate = document.getElementById('dynamic-row-template');
const form = document.getElementById('recipe-form');
const ingredientsList = document.getElementById('ingredients-list');
const stepsList = document.getElementById('steps-list');
const formStatus = document.getElementById('form-status');
const recipeList = document.getElementById('recipe-list');
const recipeCount = document.getElementById('recipe-count');
const imageFileInput = document.getElementById('image_file');
const imageUploadButton = document.getElementById('upload-image-btn');
const imagePreview = document.getElementById('image-preview');
const imageUrlInput = document.getElementById('img_url');
const editingRecipeIdInput = document.getElementById('editing_recipe_id');
const formTitle = document.getElementById('form-title');
const submitModeLabel = document.getElementById('submit-mode-label');
const submitText = document.getElementById('submit-text');
const cancelEditButton = document.getElementById('cancel-edit-btn');

const state = {
    recipes: [],
    previewObjectUrl: '',
};

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function addDynamicRow(target, placeholder) {
    const fragment = rowTemplate.content.cloneNode(true);
    const wrapper = fragment.querySelector('.dynamic-row');
    const input = fragment.querySelector('input');
    const removeButton = fragment.querySelector('button');

    input.placeholder = placeholder;
    removeButton.addEventListener('click', () => {
        wrapper.remove();
    });
    target.appendChild(fragment);
}

function setPreviewContent(content) {
    imagePreview.classList.remove('empty');
    imagePreview.innerHTML = content;
}

function releasePreviewUrl() {
    if (state.previewObjectUrl) {
        URL.revokeObjectURL(state.previewObjectUrl);
        state.previewObjectUrl = '';
    }
}

function setImagePreview(src) {
    const value = String(src || '').trim();
    releasePreviewUrl();
    if (!value) {
        imagePreview.classList.add('empty');
        imagePreview.textContent = '未选择图片';
        return;
    }

    setPreviewContent(`
        <img src="${escapeHtml(value)}" alt="食谱图片预览" referrerpolicy="no-referrer">
        <div class="mt-2 px-3 pb-3 text-[11px] text-slate-400 break-all">${escapeHtml(value)}</div>
    `);

    const imageElement = imagePreview.querySelector('img');
    imageElement?.addEventListener('error', () => {
        setPreviewContent(`
            <div class="image-preview-fallback">图片无法显示，请确认路径可访问：${escapeHtml(value)}</div>
        `);
    }, { once: true });
}

function setImagePreviewFromFile(file) {
    releasePreviewUrl();
    state.previewObjectUrl = URL.createObjectURL(file);
    setPreviewContent(`
        <img src="${escapeHtml(state.previewObjectUrl)}" alt="本地图片预览">
        <div class="mt-2 px-3 pb-3 text-[11px] text-slate-400 break-all">${escapeHtml(file.name)}</div>
    `);
}

function ensureInitialRows() {
    if (!ingredientsList.children.length) {
        addDynamicRow(ingredientsList, '例如：五花肉 500g');
        addDynamicRow(ingredientsList, '例如：冰糖 30g');
    }
    if (!stepsList.children.length) {
        addDynamicRow(stepsList, '例如：焯水去腥');
        addDynamicRow(stepsList, '例如：慢火炖煮 45 分钟');
    }
}

function collectRows(target) {
    return Array.from(target.querySelectorAll('input'))
        .map((input) => input.value.trim())
        .filter(Boolean);
}

function replaceRows(target, values, placeholder) {
    target.innerHTML = '';
    for (const value of values) {
        const fragment = rowTemplate.content.cloneNode(true);
        const wrapper = fragment.querySelector('.dynamic-row');
        const input = fragment.querySelector('input');
        const removeButton = fragment.querySelector('button');

        input.placeholder = placeholder;
        input.value = value;
        removeButton.addEventListener('click', () => {
            wrapper.remove();
        });
        target.appendChild(fragment);
    }
    if (!target.children.length) {
        addDynamicRow(target, placeholder);
    }
}

function resetFormMode() {
    editingRecipeIdInput.value = '';
    formTitle.textContent = '新增菜谱';
    submitModeLabel.textContent = 'Submit';
    submitText.textContent = '写入菜谱库';
    cancelEditButton.classList.add('hidden');
}

function setEditMode(recipe) {
    editingRecipeIdInput.value = String(recipe.id);
    formTitle.textContent = `编辑菜谱 #${recipe.id}`;
    submitModeLabel.textContent = 'Update';
    submitText.textContent = '保存修改';
    cancelEditButton.classList.remove('hidden');
}

function fillForm(recipe) {
    form.elements.name.value = recipe.name;
    form.elements.category.value = recipe.category;
    form.elements.rarity.value = String(recipe.rarity);
    imageUrlInput.value = recipe.img_url;
    form.elements.description.value = recipe.description;
    imageFileInput.value = '';
    replaceRows(ingredientsList, recipe.ingredients, '例如：五花肉 500g');
    replaceRows(stepsList, recipe.steps, '例如：焯水去腥');
    setImagePreview(recipe.img_url);
    setEditMode(recipe);
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetRecipeForm() {
    form.reset();
    releasePreviewUrl();
    setImagePreview('');
    ingredientsList.innerHTML = '';
    stepsList.innerHTML = '';
    ensureInitialRows();
    resetFormMode();
}

function setFormStatus(message, tone = 'idle') {
    const toneMap = {
        idle: 'border-white/10 bg-black/20 text-slate-300',
        busy: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
        success: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100',
        error: 'border-rose-300/20 bg-rose-300/10 text-rose-100',
    };
    formStatus.textContent = message;
    formStatus.className = `rounded-full px-3 py-1 text-xs ${toneMap[tone] || toneMap.idle}`;
}

function getErrorMessage(detail, fallback = '请求失败') {
    if (Array.isArray(detail) && detail.length) {
        const first = detail[0];
        return first.msg || fallback;
    }
    if (typeof detail === 'string' && detail.trim()) {
        return detail;
    }
    return fallback;
}

function validateRecipePayload(payload) {
    if (!payload.name) {
        return '请填写菜名';
    }
    if (!payload.img_url) {
        return '请先上传图片，或手动填写图片路径';
    }
    if (!payload.description) {
        return '请填写风味描述';
    }
    if (!payload.ingredients.length) {
        return '至少填写一个食材';
    }
    if (!payload.steps.length) {
        return '至少填写一个步骤';
    }
    return '';
}

function buildRecipeItem(recipe) {
    const safeImgUrl = escapeHtml(recipe.img_url);
    return `
        <article class="recipe-item">
            <img class="recipe-item-image" src="${safeImgUrl}" alt="${escapeHtml(recipe.name)}" loading="lazy" referrerpolicy="no-referrer">
            <div class="space-y-3 p-4">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <h3 class="text-lg font-bold text-white">${escapeHtml(recipe.name)}</h3>
                        <p class="mt-1 text-xs uppercase tracking-[0.26em] text-slate-400">${escapeHtml(recipe.category)}</p>
                    </div>
                    <div class="text-sm" style="color:${recipe.rarity === 5 ? '#f6c36a' : recipe.rarity === 4 ? '#d8a8ff' : '#7fc7ff'}">${'✦'.repeat(recipe.rarity)}</div>
                </div>
                <p class="text-sm leading-6 text-slate-300">${escapeHtml(recipe.description)}</p>
                <div class="flex flex-wrap gap-2">
                    ${recipe.ingredients.map((item) => `<span class="pill-tag">${escapeHtml(item)}</span>`).join('')}
                </div>
                <div class="flex gap-2 pt-1">
                    <button type="button" class="mini-action" data-edit-recipe-id="${recipe.id}">编辑食谱</button>
                    <button type="button" class="mini-action mini-action-danger" data-delete-recipe-id="${recipe.id}">删除食谱</button>
                </div>
            </div>
        </article>
    `;
}

async function loadRecipes() {
    recipeCount.textContent = '加载中';
    recipeList.innerHTML = '<div class="empty-state md:col-span-2">正在同步数据库中的菜谱列表…</div>';

    const response = await fetch('/api/v1/recipes', { headers: { Accept: 'application/json' } });
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.detail || '读取菜谱失败');
    }

    state.recipes = payload;

    recipeCount.textContent = `${payload.length} 道菜`;
    if (!payload.length) {
        recipeList.innerHTML = '<div class="empty-state md:col-span-2">当前没有菜谱，请先录入数据。</div>';
        return;
    }

    recipeList.innerHTML = payload.map(buildRecipeItem).join('');
    recipeList.querySelectorAll('.recipe-item-image').forEach((img) => {
        img.addEventListener('error', () => {
            const alt = img.getAttribute('alt') || '菜谱图片';
            img.outerHTML = `<div class="recipe-item-image-fallback">${escapeHtml(alt)} 图片无法加载</div>`;
        }, { once: true });
    });
}

async function submitRecipe(event) {
    event.preventDefault();
    setFormStatus('提交中', 'busy');

    const formData = new FormData(form);
    const payload = {
        name: String(formData.get('name') || '').trim(),
        category: String(formData.get('category') || '').trim(),
        rarity: Number(formData.get('rarity') || 3),
        img_url: String(formData.get('img_url') || '').trim(),
        description: String(formData.get('description') || '').trim(),
        ingredients: collectRows(ingredientsList),
        steps: collectRows(stepsList),
    };
    const editingRecipeId = Number(editingRecipeIdInput.value || 0);

    try {
        if (!payload.img_url && imageFileInput.files?.[0]) {
            payload.img_url = await uploadRecipeImage({ silent: true });
            imageUrlInput.value = payload.img_url;
        }

        const validationMessage = validateRecipePayload(payload);
        if (validationMessage) {
            throw new Error(validationMessage);
        }

        const isEditing = editingRecipeId > 0;
        const endpoint = isEditing ? `/api/v1/recipes/${editingRecipeId}` : '/api/v1/recipes';
        const method = isEditing ? 'PUT' : 'POST';

        const response = await fetch(endpoint, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(getErrorMessage(result.detail, '提交失败'));
        }

        resetRecipeForm();
        setFormStatus(`${isEditing ? '已更新' : '已录入'}：${result.name}`, 'success');
        await loadRecipes();
    } catch (error) {
        setFormStatus(error.message, 'error');
    }
}

async function uploadRecipeImage(options = {}) {
    const { silent = false } = options;
    const file = imageFileInput.files?.[0];
    if (!file) {
        if (!silent) {
            setFormStatus('请先选择图片文件', 'error');
        }
        throw new Error('请先选择图片文件');
    }

    if (!silent) {
        setFormStatus('上传图片中', 'busy');
    }
    const payload = new FormData();
    payload.append('file', file);

    const response = await fetch('/api/v1/uploads/recipe-image', {
        method: 'POST',
        body: payload,
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(getErrorMessage(result.detail, '图片上传失败'));
    }

    imageUrlInput.value = result.img_url;
    setImagePreview(result.img_url);
    if (!silent) {
        setFormStatus(`图片已上传：${result.original_filename}`, 'success');
    }
    return result.img_url;
}

async function deleteRecipe(recipeId) {
    setFormStatus(`删除中 #${recipeId}`, 'busy');
    const response = await fetch(`/api/v1/recipes/${recipeId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        let result = null;
        try {
            result = await response.json();
        } catch {
            result = null;
        }
        throw new Error(getErrorMessage(result?.detail, '删除失败'));
    }

    setFormStatus(`已删除 #${recipeId}`, 'success');
    if (Number(editingRecipeIdInput.value || 0) === recipeId) {
        resetRecipeForm();
    }
    await loadRecipes();
}

document.querySelectorAll('[data-add-row]').forEach((button) => {
    button.addEventListener('click', () => {
        const target = button.dataset.addRow === 'ingredients' ? ingredientsList : stepsList;
        const placeholder = button.dataset.addRow === 'ingredients' ? '例如：盐 2g' : '例如：收汁后即可出锅';
        addDynamicRow(target, placeholder);
    });
});

imageUploadButton?.addEventListener('click', async () => {
    try {
        await uploadRecipeImage();
    } catch (error) {
        setFormStatus(error.message, 'error');
    }
});
imageFileInput?.addEventListener('change', () => {
    const file = imageFileInput.files?.[0];
    if (!file) {
        setImagePreview(imageUrlInput.value);
        return;
    }
    setImagePreviewFromFile(file);
});
imageUrlInput?.addEventListener('input', () => {
    if (!imageFileInput.files?.length) {
        setImagePreview(imageUrlInput.value);
    }
});

document.getElementById('reload-list')?.addEventListener('click', async () => {
    try {
        await loadRecipes();
    } catch (error) {
        recipeList.innerHTML = `<div class="empty-state md:col-span-2">${error.message}</div>`;
        recipeCount.textContent = '加载失败';
    }
});

cancelEditButton?.addEventListener('click', () => {
    resetRecipeForm();
    setFormStatus('已退出编辑模式', 'idle');
});

form.addEventListener('submit', submitRecipe);

ensureInitialRows();
setImagePreview('');
loadRecipes().catch((error) => {
    recipeList.innerHTML = `<div class="empty-state md:col-span-2">${error.message}</div>`;
    recipeCount.textContent = '加载失败';
});

recipeList.addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-edit-recipe-id]');
    if (editButton) {
        const recipeId = Number(editButton.dataset.editRecipeId || 0);
        const recipe = state.recipes.find((item) => item.id === recipeId);
        if (recipe) {
            fillForm(recipe);
            setFormStatus(`正在编辑：${recipe.name}`, 'busy');
        }
        return;
    }

    const deleteButton = event.target.closest('[data-delete-recipe-id]');
    if (!deleteButton) {
        return;
    }

    const recipeId = Number(deleteButton.dataset.deleteRecipeId || 0);
    if (!recipeId) {
        return;
    }

    const shouldDelete = window.confirm(`确认删除食谱 #${recipeId} 吗？`);
    if (!shouldDelete) {
        return;
    }

    try {
        await deleteRecipe(recipeId);
    } catch (error) {
        setFormStatus(error.message, 'error');
    }
});