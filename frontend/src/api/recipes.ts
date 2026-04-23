import type { Recipe, RecipeCreate, ImageUploadResponse } from '@/types'

const BASE = '/api/v1'

function parseError(detail: unknown, fallback = '请求失败'): string {
  if (Array.isArray(detail) && detail.length) {
    return (detail[0] as { msg?: string }).msg || fallback
  }
  if (typeof detail === 'string' && detail.trim()) return detail
  return fallback
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options?.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(parseError((data as { detail?: unknown }).detail))
  return data as T
}

export const recipesApi = {
  wish(count: number, category?: string, keyword?: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ count: String(count) })
    if (category) params.set('category', category)
    if (keyword) params.set('keyword', keyword)
    return request<Recipe[]>(`${BASE}/wish?${params}`, { signal })
  },

  recommend() {
    return request<Recipe[]>(`${BASE}/recommend`)
  },

  getAll() {
    return request<Recipe[]>(`${BASE}/recipes`)
  },

  create(payload: RecipeCreate) {
    return request<Recipe>(`${BASE}/recipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },

  update(id: number, payload: RecipeCreate) {
    return request<Recipe>(`${BASE}/recipes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },

  async remove(id: number) {
    const res = await fetch(`${BASE}/recipes/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      let data: { detail?: unknown } | null = null
      try { data = await res.json() } catch { /* empty */ }
      throw new Error(parseError(data?.detail, '删除失败'))
    }
  },

  batchImport(recipes: RecipeCreate[]) {
    return request<Recipe[]>(`${BASE}/recipes/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipes }),
    })
  },

  async uploadImage(file: File): Promise<ImageUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${BASE}/uploads/recipe-image`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json() as { detail?: unknown } & Partial<ImageUploadResponse>
    if (!res.ok) throw new Error(parseError(data.detail, '图片上传失败'))
    return data as ImageUploadResponse
  },
}
