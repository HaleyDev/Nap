<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStarCanvas } from '@/composables/useStarCanvas'
import { useAudio } from '@/composables/useAudio'
import { useHistory } from '@/composables/useHistory'
import { recipesApi } from '@/api/recipes'
import { RARITY_COLORS, VALID_CATEGORIES } from '@/types'
import type { Recipe } from '@/types'

/* ── Canvas background ── */
const { canvasRef } = useStarCanvas()

/* ── Audio ── */
const { playRevealSound, playConfirmSound } = useAudio()

/* ── History ── */
const { history, addEntry, removeEntry, clearAll } = useHistory()

/* ── State ── */
const view = ref<'config' | 'results'>('config')
const isLoading = ref(false)
const meteorColor = ref(RARITY_COLORS[3])
const results = ref<Recipe[]>([])
const revealedCards = ref<Set<number>>(new Set())
const selectedRecipe = ref<Recipe | null>(null)
const showModal = ref(false)
const errorSnackbar = ref(false)
const errorMessage = ref('')

/* ── Form values ── */
const wishCategory = ref('')
const wishKeyword = ref('')
const wishCount = ref(1)

/* ── Abort controller ── */
let controller: AbortController | null = null

/* ── Helpers ── */
function rarityStars(n: number) {
  return '✦'.repeat(n)
}
function rarityColor(n: number) {
  return RARITY_COLORS[n] ?? '#fff'
}
function setMeteorColor(rarity: number) {
  meteorColor.value = RARITY_COLORS[rarity] ?? RARITY_COLORS[3]
}
function showError(msg: string) {
  errorMessage.value = msg
  errorSnackbar.value = true
}

/* ── Wish action ── */
async function triggerWish() {
  controller?.abort()
  controller = new AbortController()
  isLoading.value = true
  try {
    const data = await recipesApi.wish(
      wishCount.value,
      wishCategory.value || undefined,
      wishKeyword.value.trim() || undefined,
      controller.signal,
    )
    const highest = Math.max(...data.map(r => r.rarity))
    setMeteorColor(highest)
    await new Promise(r => setTimeout(r, 1180))
    results.value = data
    revealedCards.value = new Set()
    view.value = 'results'
    data.forEach((_, i) => {
      setTimeout(() => {
        revealedCards.value = new Set([...revealedCards.value, i])
        playRevealSound()
      }, 90 * i + 80)
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.name !== 'AbortError') showError(err.message)
  } finally {
    setTimeout(() => { isLoading.value = false }, 40)
  }
}

/* ── Recommend action ── */
async function triggerRecommend() {
  isLoading.value = true
  try {
    const data = await recipesApi.recommend()
    if (!data.length) { showError('还没有菜谱数据'); return }
    const highest = Math.max(...data.map(r => r.rarity))
    setMeteorColor(highest)
    await new Promise(r => setTimeout(r, 800))
    results.value = data
    revealedCards.value = new Set()
    view.value = 'results'
    data.forEach((_, i) => {
      setTimeout(() => {
        revealedCards.value = new Set([...revealedCards.value, i])
        playRevealSound()
      }, 90 * i + 80)
    })
  } catch (err: unknown) {
    if (err instanceof Error) showError(err.message)
  } finally {
    setTimeout(() => { isLoading.value = false }, 40)
  }
}

/* ── Confirm selection ── */
function confirmSelection() {
  if (!results.value.length) return
  playConfirmSound()
  addEntry(results.value.map(r => r.name))
  view.value = 'config'
}

/* ── Back ── */
function goBack() {
  view.value = 'config'
}

/* ── Count label ── */
const countLabel = computed(() => `灵感数量：${wishCount.value}`)
</script>

<template>
  <!-- Star canvas background -->
  <canvas ref="canvasRef" id="bg-canvas" />

  <!-- ═══════════ CONFIG VIEW ═══════════ -->
  <div v-if="view === 'config'" class="config-view">
    <div class="config-inner">
      <!-- Title -->
      <div class="text-center mb-6">
        <h1 class="text-h4 font-weight-black tracking-widest text-white">吃点什么</h1>
        <p class="text-body-2 text-medium-emphasis mt-2">从你的菜谱库里帮你挑几道灵感</p>
      </div>

      <!-- Form panel -->
      <v-card
        class="wish-panel"
        rounded="xl"
        border
        variant="outlined"
        color="rgba(255,255,255,0.1)"
      >
        <v-card-text class="pa-6">
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-select
                v-model="wishCategory"
                label="菜品类别"
                :items="['', ...VALID_CATEGORIES]"
                :item-title="(v: string) => v === '' ? '全部分类' : v"
                :item-value="(v: string) => v"
                variant="outlined"
                density="comfortable"
                bg-color="rgba(0,0,0,0.2)"
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="wishKeyword"
                label="关键字筛选"
                placeholder="辣、牛肉、清淡…"
                variant="outlined"
                density="comfortable"
                bg-color="rgba(0,0,0,0.2)"
                clearable
                hide-details
              />
            </v-col>
          </v-row>

          <div class="mt-4">
            <div class="d-flex align-center gap-3">
              <v-slider
                v-model="wishCount"
                :label="countLabel"
                :min="1"
                :max="20"
                :step="1"
                color="primary"
                track-color="rgba(255,255,255,0.15)"
                hide-details
                class="flex-1"
              />
              <span class="text-h6 font-weight-black text-primary ml-2" style="min-width:2rem;text-align:center">
                {{ wishCount }}
              </span>
            </div>
            <p class="text-caption text-medium-emphasis mt-2">
              按分类或关键字筛选时，只会从匹配的菜谱中抽取。拖动滑块选择灵感数量。
            </p>
          </div>

          <v-btn
            @click="triggerWish"
            block
            size="x-large"
            color="primary"
            class="mt-5 font-weight-black text-h6"
            rounded="xl"
            elevation="0"
          >
            开始抽取
          </v-btn>
        </v-card-text>
      </v-card>

      <!-- Bottom links -->
      <div class="d-flex justify-space-between align-center mt-4 px-1">
        <v-btn
          variant="text"
          size="small"
          class="text-medium-emphasis"
          @click="triggerRecommend"
        >
          随机每类推荐一道
        </v-btn>
        <v-btn variant="text" size="small" class="text-medium-emphasis" href="/admin">
          菜谱管理
        </v-btn>
      </div>

      <!-- History panel -->
      <div v-if="history.length" class="mt-6">
        <div class="d-flex justify-space-between align-center mb-3">
          <span class="text-body-2 font-weight-semibold text-medium-emphasis">已确认的选择</span>
          <v-btn variant="text" size="x-small" color="error" @click="clearAll">清空记录</v-btn>
        </div>
        <div class="d-flex flex-column gap-2">
          <v-card
            v-for="(entry, idx) in history"
            :key="idx"
            variant="outlined"
            rounded="lg"
            color="rgba(255,255,255,0.1)"
            class="history-entry"
          >
            <v-card-text class="py-3 px-4">
              <div class="d-flex justify-space-between align-center mb-1">
                <span class="text-caption text-medium-emphasis">{{ entry.time }}</span>
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  color="error"
                  @click="removeEntry(idx)"
                >
                  <v-icon size="14">mdi-close</v-icon>
                </v-btn>
              </div>
              <div class="d-flex flex-wrap gap-1">
                <span v-for="name in entry.items" :key="name" class="pill-tag text-caption">
                  {{ name }}
                </span>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══════════ RESULTS VIEW ═══════════ -->
  <div v-if="view === 'results'" class="result-view">
    <div class="result-view-inner">
      <!-- Header -->
      <div class="d-flex justify-space-between align-center pa-4 pt-6">
        <div>
          <p class="text-overline text-medium-emphasis">Results</p>
          <h2 class="text-h5 font-weight-bold text-white mt-1">灵感结果</h2>
        </div>
        <div class="d-flex align-center gap-2">
          <span class="text-body-2 text-medium-emphasis">{{ results.length }} 道</span>
          <v-btn
            size="small"
            variant="outlined"
            color="success"
            rounded="xl"
            @click="confirmSelection"
          >
            确认选择
          </v-btn>
          <v-btn
            size="small"
            variant="outlined"
            rounded="xl"
            @click="goBack"
          >
            返回
          </v-btn>
        </div>
      </div>

      <!-- Cards -->
      <div class="cards-wrapper">
        <div
          v-for="(recipe, i) in results"
          :key="recipe.id"
          class="wish-card-shell"
        >
          <button
            type="button"
            class="wish-card"
            :class="{ revealed: revealedCards.has(i) }"
            @click="selectedRecipe = recipe; showModal = true"
          >
            <span class="wish-card-face wish-card-back" />
            <span
              class="wish-card-face wish-card-front"
              :data-rarity="recipe.rarity"
              :style="{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.08)), url('${recipe.img_url}')` }"
            >
              <span class="wish-card-gloss" />
              <div class="wish-card-info">
                <span
                  class="d-inline-flex rounded-pill px-2 py-1 text-caption"
                  style="background:rgba(0,0,0,0.3);letter-spacing:0.2em;text-transform:uppercase;color:#e2e8f0"
                >
                  {{ recipe.category }}
                </span>
                <div class="text-h6 font-weight-black text-white mt-2">{{ recipe.name }}</div>
                <div class="mt-1" :style="{ color: rarityColor(recipe.rarity) }">
                  {{ rarityStars(recipe.rarity) }}
                </div>
              </div>
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══════════ LOADING OVERLAY ═══════════ -->
  <Transition name="fade">
    <div v-if="isLoading" class="loading-overlay">
      <div class="meteor-layer" :style="{ '--meteor-color': meteorColor }">
        <div class="meteor-core" />
        <div class="meteor-tail" />
      </div>
    </div>
  </Transition>

  <!-- ═══════════ DETAIL MODAL ═══════════ -->
  <v-dialog
    v-model="showModal"
    max-width="720"
    scrollable
  >
    <v-card v-if="selectedRecipe" rounded="xl" color="#0d121e" border>
      <!-- Hero image -->
      <div
        class="detail-hero"
        :style="{ backgroundImage: `url('${selectedRecipe.img_url}')` }"
      />

      <v-btn
        icon
        size="small"
        variant="outlined"
        class="modal-close-btn"
        @click="selectedRecipe = null; showModal = false"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>

      <v-card-text class="pa-5 pa-sm-6">
        <!-- Rarity & title -->
        <div class="d-flex gap-1 mb-2">
          <span
            v-for="n in selectedRecipe.rarity"
            :key="n"
            :style="{ color: rarityColor(selectedRecipe.rarity), fontSize: '20px' }"
          >✦</span>
        </div>
        <h3 class="text-h5 font-weight-black text-white">{{ selectedRecipe.name }}</h3>
        <p class="text-overline text-medium-emphasis mt-1">
          {{ selectedRecipe.category }} / {{ selectedRecipe.rarity }} 星
        </p>

        <!-- Keywords -->
        <div class="mt-4">
          <p class="section-label mb-2">关键词</p>
          <div class="d-flex flex-wrap gap-2">
            <template v-if="selectedRecipe.keywords.length">
              <span v-for="k in selectedRecipe.keywords" :key="k" class="pill-tag">{{ k }}</span>
            </template>
            <span v-else class="text-body-2 text-medium-emphasis">无</span>
          </div>
        </div>

        <!-- Ingredients -->
        <div class="mt-4">
          <p class="section-label mb-2">食材</p>
          <div class="d-flex flex-wrap gap-2">
            <span v-for="item in selectedRecipe.ingredients" :key="item" class="pill-tag">{{ item }}</span>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Error snackbar -->
  <v-snackbar v-model="errorSnackbar" color="error" timeout="3000" location="top">
    {{ errorMessage }}
  </v-snackbar>
</template>

<style scoped>
.config-view {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 32px 16px;
}
.config-inner {
  width: 100%;
  max-width: 520px;
}
.wish-panel {
  background: rgba(10,14,24,0.82) !important;
  backdrop-filter: blur(24px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 60px rgba(0,0,0,0.38) !important;
}
.history-entry {
  background: rgba(2,6,14,0.5) !important;
}
.cards-wrapper {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  padding: 20px 16px 40px;
}
.detail-hero {
  height: 220px;
  background-size: cover;
  background-position: center;
  position: relative;
  border-radius: 12px 12px 0 0;
}
.detail-hero::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.12), rgba(8,12,20,0.92));
  border-radius: inherit;
}
.modal-close-btn {
  position: absolute !important;
  top: 12px;
  right: 12px;
  z-index: 20;
}
.section-label {
  font-size: 12px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: #e2e8f0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.section-label::before {
  content: "";
  width: 24px;
  height: 1px;
  background: rgba(246,195,106,0.8);
  display: inline-block;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
