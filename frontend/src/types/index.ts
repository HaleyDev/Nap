export interface Recipe {
  id: number
  name: string
  category: string
  rarity: number
  img_url: string
  keywords: string[]
  ingredients: string[]
  last_cooked: string | null
}

export interface RecipeCreate {
  name: string
  category: string
  rarity: number
  img_url: string
  keywords: string[]
  ingredients: string[]
}

export interface ImageUploadResponse {
  img_url: string
  original_filename: string
}

export interface HistoryEntry {
  time: string
  items: string[]
}

export const RARITY_COLORS: Record<number, string> = {
  5: '#f6c36a',
  4: '#d8a8ff',
  3: '#7fc7ff',
}

export const VALID_CATEGORIES = ['主食', '汤', '素菜', '荤菜']
export const VALID_RARITIES = [3, 4, 5]
