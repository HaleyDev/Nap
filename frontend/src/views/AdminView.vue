<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { recipesApi } from '@/api/recipes'
import { VALID_CATEGORIES, RARITY_COLORS } from '@/types'
import type { Recipe, RecipeCreate } from '@/types'

/* ── State ── */
const recipes = ref<Recipe[]>([])
const loading = ref(false)
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref('success')

/* ── Form state ── */
const editingId = ref<number | null>(null)
const formName = ref('')
const formCategory = ref('荤菜')
const formRarity = ref(3)
const formImgUrl = ref('')
const ingredients = ref<string[]>([''])
const keywords = ref<string[]>([''])

/* ── Image upload state ── */
const imageFile = ref<File | null>(null)
const imageFileInput = ref<HTMLInputElement | null>(null)
const previewUrl = ref('')
const previewObjectUrl = ref('')
const uploadStatus = ref('')
const uploadLoading = ref(false)

/* ── Batch import state ── */
const batchJson = ref('')
const batchStatus = ref('粘贴 JSON 数组后点击导入')
const batchLoading = ref(false)

/* ── Delete dialog ── */
const deleteDialog = ref(false)
const deleteTarget = ref<Recipe | null>(null)

/* ── Snackbar helper ── */
function notify(msg: string, color = 'success') {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

/* ── Load recipes ── */
async function loadRecipes() {
  loading.value = true
  try {
    recipes.value = await recipesApi.getAll()
  } catch (err: unknown) {
    notify(err instanceof Error ? err.message : '加载失败', 'error')
  } finally {
    loading.value = false
  }
}

/* ── Dynamic row helpers ── */
function addIngredient() { ingredients.value.push('') }
function removeIngredient(i: number) {
  ingredients.value.splice(i, 1)
  if (!ingredients.value.length) ingredients.value.push('')
}
function addKeyword() { keywords.value.push('') }
function removeKeyword(i: number) {
  keywords.value.splice(i, 1)
  if (!keywords.value.length) keywords.value.push('')
}

/* ── Image preview ── */
function releasePreview() {
  if (previewObjectUrl.value) {
    URL.revokeObjectURL(previewObjectUrl.value)
    previewObjectUrl.value = ''
  }
}
function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) { previewUrl.value = formImgUrl.value; return }
  releasePreview()
  previewObjectUrl.value = URL.createObjectURL(file)
  previewUrl.value = previewObjectUrl.value
  imageFile.value = file
}
function onImgUrlInput() {
  if (!imageFile.value) previewUrl.value = formImgUrl.value
}
function triggerFileInput() { imageFileInput.value?.click() }

/* ── Upload image ── */
async function uploadImage(silent = false) {
  if (!imageFile.value) {
    if (!silent) notify('请先选择图片文件', 'error')
    throw new Error('请先选择图片文件')
  }
  if (!silent) { uploadLoading.value = true; uploadStatus.value = '上传中…' }
  try {
    const result = await recipesApi.uploadImage(imageFile.value)
    formImgUrl.value = result.img_url
    releasePreview()
    previewUrl.value = result.img_url
    previewObjectUrl.value = ''
    if (!silent) { notify(`图片已上传：${result.original_filename}`); uploadStatus.value = `已上传：${result.original_filename}` }
    return result.img_url
  } catch (err: unknown) {
    if (!silent) notify(err instanceof Error ? err.message : '上传失败', 'error')
    throw err
  } finally {
    uploadLoading.value = false
  }
}

/* ── Submit recipe ── */
async function submitRecipe() {
  // Auto-upload image if file selected but no URL yet
  if (!formImgUrl.value && imageFile.value) {
    try { await uploadImage(true) } catch { return }
  }
  if (!formName.value.trim()) { notify('请填写菜名', 'error'); return }
  if (!formImgUrl.value.trim()) { notify('请填写或上传图片', 'error'); return }
  const ingList = ingredients.value.map(s => s.trim()).filter(Boolean)
  if (!ingList.length) { notify('至少填写一个食材', 'error'); return }

  const payload: RecipeCreate = {
    name: formName.value.trim(),
    category: formCategory.value,
    rarity: formRarity.value,
    img_url: formImgUrl.value.trim(),
    keywords: keywords.value.map(s => s.trim()).filter(Boolean),
    ingredients: ingList,
  }

  try {
    if (editingId.value) {
      const updated = await recipesApi.update(editingId.value, payload)
      notify(`已更新：${updated.name}`)
    } else {
      const created = await recipesApi.create(payload)
      notify(`已录入：${created.name}`)
    }
    resetForm()
    await loadRecipes()
  } catch (err: unknown) {
    notify(err instanceof Error ? err.message : '提交失败', 'error')
  }
}

/* ── Edit recipe ── */
function editRecipe(r: Recipe) {
  editingId.value = r.id
  formName.value = r.name
  formCategory.value = r.category
  formRarity.value = r.rarity
  formImgUrl.value = r.img_url
  previewUrl.value = r.img_url
  imageFile.value = null
  ingredients.value = r.ingredients.length ? [...r.ingredients] : ['']
  keywords.value = r.keywords.length ? [...r.keywords] : ['']
}

/* ── Reset form ── */
function resetForm() {
  editingId.value = null
  formName.value = ''
  formCategory.value = '荤菜'
  formRarity.value = 3
  formImgUrl.value = ''
  previewUrl.value = ''
  previewObjectUrl.value = ''
  imageFile.value = null
  uploadStatus.value = ''
  ingredients.value = ['']
  keywords.value = ['']
}

/* ── Delete recipe ── */
function confirmDelete(r: Recipe) {
  deleteTarget.value = r
  deleteDialog.value = true
}
async function doDelete() {
  if (!deleteTarget.value) return
  const id = deleteTarget.value.id
  deleteDialog.value = false
  try {
    await recipesApi.remove(id)
    notify(`已删除 #${id}`)
    if (editingId.value === id) resetForm()
    await loadRecipes()
  } catch (err: unknown) {
    notify(err instanceof Error ? err.message : '删除失败', 'error')
  }
}

/* ── Batch import ── */
async function batchImport() {
  const raw = batchJson.value.trim()
  if (!raw) { batchStatus.value = '请粘贴 JSON 数据'; return }
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { batchStatus.value = 'JSON 格式错误'; return }
  const arr = Array.isArray(parsed) ? parsed : [parsed]
  batchStatus.value = `导入中（${arr.length} 条）…`
  batchLoading.value = true
  try {
    const result = await recipesApi.batchImport(arr as RecipeCreate[])
    batchStatus.value = `成功导入 ${result.length} 条菜谱`
    batchJson.value = ''
    await loadRecipes()
  } catch (err: unknown) {
    batchStatus.value = err instanceof Error ? err.message : '导入失败'
  } finally {
    batchLoading.value = false
  }
}

/* ── Rarity color ── */
function rarityColor(n: number) {
  return RARITY_COLORS[n] ?? '#fff'
}
function rarityStars(n: number) {
  return '✦'.repeat(n)
}

onMounted(loadRecipes)
</script>

<template>
  <v-app>
    <v-main style="background:transparent">
      <v-container fluid class="pa-4 pa-sm-6 pa-lg-10" style="max-width:1400px">

        <!-- Header -->
        <v-card variant="outlined" rounded="xl" color="rgba(255,255,255,0.1)" class="header-card mb-6">
          <v-card-text class="d-flex flex-column flex-sm-row align-sm-end justify-sm-space-between gap-4 pa-5 pa-sm-6">
            <div>
              <p class="text-overline text-medium-emphasis">Recipe Admin</p>
              <h1 class="text-h4 font-weight-black text-white mt-2 tracking-widest">菜谱库管理</h1>
            </div>
            <div class="d-flex gap-3">
              <v-btn variant="outlined" rounded="xl" size="small" href="/">返回抽奖页</v-btn>
              <v-btn
                variant="outlined"
                rounded="xl"
                size="small"
                color="success"
                :loading="loading"
                @click="loadRecipes"
              >
                刷新列表
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <v-row>
          <!-- Left column: form + batch import -->
          <v-col cols="12" xl="4">
            <!-- Recipe form -->
            <v-card variant="outlined" rounded="xl" color="rgba(255,255,255,0.1)" class="form-card mb-6">
              <v-card-text class="pa-5 pa-sm-6">
                <div class="d-flex justify-space-between align-start mb-4">
                  <div>
                    <p class="text-overline text-medium-emphasis">
                      {{ editingId ? 'Update Recipe' : 'Create Recipe' }}
                    </p>
                    <h2 class="text-h5 font-weight-bold text-white mt-1">
                      {{ editingId ? `编辑菜谱 #${editingId}` : '新增菜谱' }}
                    </h2>
                  </div>
                  <v-btn
                    v-if="editingId"
                    variant="text"
                    size="small"
                    color="warning"
                    @click="resetForm"
                  >
                    取消编辑
                  </v-btn>
                </div>

                <!-- Name -->
                <v-text-field
                  v-model="formName"
                  label="菜名"
                  placeholder="例如：红烧肉"
                  variant="outlined"
                  density="comfortable"
                  maxlength="100"
                  class="mb-3"
                  hide-details="auto"
                />

                <!-- Category & Rarity -->
                <v-row dense class="mb-3">
                  <v-col cols="6">
                    <v-select
                      v-model="formCategory"
                      label="分类"
                      :items="VALID_CATEGORIES"
                      variant="outlined"
                      density="comfortable"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-select
                      v-model="formRarity"
                      label="稀有度"
                      :items="[{title:'3 星',value:3},{title:'4 星',value:4},{title:'5 星',value:5}]"
                      item-title="title"
                      item-value="value"
                      variant="outlined"
                      density="comfortable"
                      hide-details
                    />
                  </v-col>
                </v-row>

                <!-- Image URL -->
                <v-text-field
                  v-model="formImgUrl"
                  label="图片路径 / 外链"
                  placeholder="/static/uploads/... 或 https://..."
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                  hide-details="auto"
                  @input="onImgUrlInput"
                />

                <!-- Image upload -->
                <v-card variant="outlined" rounded="lg" color="rgba(255,255,255,0.08)" class="pa-3 mb-4">
                  <div class="d-flex justify-space-between align-center mb-2">
                    <div>
                      <p class="text-body-2 font-weight-semibold text-white">上传食谱图片</p>
                      <p class="text-caption text-medium-emphasis">JPG / PNG / WEBP，最大 5MB</p>
                    </div>
                    <v-btn
                      size="small"
                      variant="outlined"
                      rounded="xl"
                      :loading="uploadLoading"
                      @click="uploadImage(false)"
                    >
                      上传
                    </v-btn>
                  </div>

                  <div class="d-flex gap-3 align-start">
                    <div class="flex-1">
                      <input
                        ref="imageFileInput"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        style="display:none"
                        @change="onFileChange"
                      />
                      <v-btn
                        variant="outlined"
                        size="small"
                        rounded="xl"
                        block
                        @click="triggerFileInput"
                      >
                        选择本地文件
                      </v-btn>
                      <p v-if="imageFile" class="text-caption text-medium-emphasis mt-1">
                        {{ imageFile.name }}
                      </p>
                      <p v-if="uploadStatus" class="text-caption text-success mt-1">{{ uploadStatus }}</p>
                    </div>
                    <!-- Preview -->
                    <div class="image-preview" style="width:120px;flex-shrink:0">
                      <img
                        v-if="previewUrl"
                        :src="previewUrl"
                        alt="预览"
                        @error="(e: Event) => { (e.target as HTMLImageElement).style.display='none' }"
                      />
                      <span v-else class="text-caption text-medium-emphasis">未选择图片</span>
                    </div>
                  </div>
                </v-card>

                <!-- Ingredients -->
                <div class="mb-4">
                  <div class="d-flex justify-space-between align-center mb-2">
                    <p class="text-body-2 font-weight-semibold text-white">食材列表</p>
                    <v-btn size="x-small" variant="outlined" rounded="xl" @click="addIngredient">添加食材</v-btn>
                  </div>
                  <div v-for="(_, i) in ingredients" :key="i" class="d-flex gap-2 mb-2">
                    <v-text-field
                      v-model="ingredients[i]"
                      placeholder="例如：五花肉 500g"
                      variant="outlined"
                      density="compact"
                      hide-details
                      class="flex-1"
                    />
                    <v-btn icon size="small" variant="text" color="error" @click="removeIngredient(i)">
                      <v-icon size="16">mdi-close</v-icon>
                    </v-btn>
                  </div>
                </div>

                <!-- Keywords -->
                <div class="mb-5">
                  <div class="d-flex justify-space-between align-center mb-2">
                    <p class="text-body-2 font-weight-semibold text-white">关键描述词</p>
                    <v-btn size="x-small" variant="outlined" rounded="xl" @click="addKeyword">添加关键词</v-btn>
                  </div>
                  <div v-for="(_, i) in keywords" :key="i" class="d-flex gap-2 mb-2">
                    <v-text-field
                      v-model="keywords[i]"
                      placeholder="例如：家常、辣、快手"
                      variant="outlined"
                      density="compact"
                      hide-details
                      class="flex-1"
                    />
                    <v-btn icon size="small" variant="text" color="error" @click="removeKeyword(i)">
                      <v-icon size="16">mdi-close</v-icon>
                    </v-btn>
                  </div>
                </div>

                <!-- Submit -->
                <v-btn
                  block
                  size="large"
                  color="primary"
                  rounded="xl"
                  elevation="0"
                  class="font-weight-black"
                  @click="submitRecipe"
                >
                  {{ editingId ? '保存修改' : '写入菜谱库' }}
                </v-btn>
              </v-card-text>
            </v-card>

            <!-- Batch import -->
            <v-card variant="outlined" rounded="xl" color="rgba(255,255,255,0.1)" class="form-card">
              <v-card-text class="pa-5 pa-sm-6">
                <p class="text-overline text-medium-emphasis">Batch Import</p>
                <h2 class="text-h6 font-weight-bold text-white mt-1 mb-4">JSON 批量导入</h2>
                <v-textarea
                  v-model="batchJson"
                  rows="6"
                  variant="outlined"
                  placeholder='[{"name":"红烧肉","category":"荤菜","rarity":4,"img_url":"/static/uploads/x.jpg","keywords":["家常"],"ingredients":["五花肉 500g"]}]'
                  class="font-mono mb-3"
                  hide-details
                />
                <div class="d-flex justify-space-between align-center">
                  <p class="text-caption text-medium-emphasis">{{ batchStatus }}</p>
                  <v-btn
                    size="small"
                    variant="outlined"
                    rounded="xl"
                    :loading="batchLoading"
                    @click="batchImport"
                  >
                    导入
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Right column: recipe list -->
          <v-col cols="12" xl="8">
            <v-card variant="outlined" rounded="xl" color="rgba(255,255,255,0.1)" class="form-card">
              <v-card-text class="pa-5 pa-sm-6">
                <div class="d-flex justify-space-between align-center mb-4">
                  <div>
                    <p class="text-overline text-medium-emphasis">Recipe Inventory</p>
                    <h2 class="text-h5 font-weight-bold text-white mt-1">当前菜谱列表</h2>
                  </div>
                  <span class="text-body-2 text-medium-emphasis">
                    {{ loading ? '加载中…' : `${recipes.length} 道菜` }}
                  </span>
                </div>

                <!-- Loading skeleton -->
                <div v-if="loading" class="d-flex flex-wrap gap-4">
                  <v-skeleton-loader
                    v-for="i in 4" :key="i"
                    type="card"
                    width="260"
                    color="rgba(255,255,255,0.04)"
                  />
                </div>

                <!-- Empty state -->
                <div v-else-if="!recipes.length" class="empty-state">
                  当前没有菜谱
                </div>

                <!-- Recipe grid -->
                <div v-else class="recipe-grid">
                  <div
                    v-for="recipe in recipes"
                    :key="recipe.id"
                    class="recipe-item"
                  >
                    <img
                      class="recipe-item-image"
                      :src="recipe.img_url"
                      :alt="recipe.name"
                      loading="lazy"
                      referrerpolicy="no-referrer"
                      @error="(e: Event) => { const el = e.target as HTMLImageElement; el.style.display='none'; el.insertAdjacentHTML('afterend', `<div class='recipe-item-image-fallback'>${recipe.name} 图片无法加载</div>`) }"
                    />
                    <div class="pa-3">
                      <div class="d-flex justify-space-between align-start mb-1">
                        <div>
                          <p class="text-body-1 font-weight-bold text-white">{{ recipe.name }}</p>
                          <p class="text-overline text-medium-emphasis">{{ recipe.category }}</p>
                        </div>
                        <span class="text-body-1" :style="{ color: rarityColor(recipe.rarity) }">
                          {{ rarityStars(recipe.rarity) }}
                        </span>
                      </div>

                      <div v-if="recipe.keywords.length" class="d-flex flex-wrap gap-1 mb-2">
                        <span v-for="k in recipe.keywords" :key="k" class="pill-tag" style="font-size:11px;padding:2px 8px">
                          {{ k }}
                        </span>
                      </div>

                      <div class="d-flex flex-wrap gap-1 mb-3">
                        <span v-for="item in recipe.ingredients" :key="item" class="pill-tag" style="font-size:11px;padding:2px 8px">
                          {{ item }}
                        </span>
                      </div>

                      <div class="d-flex gap-2">
                        <v-btn
                          size="x-small"
                          variant="outlined"
                          rounded="xl"
                          @click="editRecipe(recipe)"
                        >
                          编辑
                        </v-btn>
                        <v-btn
                          size="x-small"
                          variant="outlined"
                          color="error"
                          rounded="xl"
                          @click="confirmDelete(recipe)"
                        >
                          删除
                        </v-btn>
                      </div>
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <!-- Delete confirm dialog -->
    <v-dialog v-model="deleteDialog" max-width="380">
      <v-card rounded="xl" color="#0d121e" border>
        <v-card-title class="text-h6 pa-5">确认删除</v-card-title>
        <v-card-text class="pa-5 pt-0">
          确认删除食谱 <strong>{{ deleteTarget?.name }}</strong> (#{{ deleteTarget?.id }}) 吗？
        </v-card-text>
        <v-card-actions class="pa-4 pt-0 gap-2">
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">取消</v-btn>
          <v-btn color="error" variant="outlined" rounded="xl" @click="doDelete">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="top">
      {{ snackbarMsg }}
    </v-snackbar>
  </v-app>
</template>

<style scoped>
.header-card,
.form-card {
  background: rgba(10,14,24,0.82) !important;
  backdrop-filter: blur(24px);
}
.recipe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.empty-state {
  border: 1px dashed rgba(255,255,255,0.16);
  border-radius: 24px;
  padding: 32px;
  text-align: center;
  color: var(--text-soft);
}
.font-mono {
  font-family: 'JetBrains Mono', monospace !important;
}
</style>
