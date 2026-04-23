import { ref } from 'vue'
import type { HistoryEntry } from '@/types'

const STORAGE_KEY = 'mgt_history'

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as HistoryEntry[]
  } catch {
    return []
  }
}

export function useHistory() {
  const history = ref<HistoryEntry[]>(loadHistory())

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value))
  }

  function addEntry(items: string[]) {
    history.value.unshift({
      time: new Date().toLocaleString('zh-CN'),
      items,
    })
    if (history.value.length > 50) history.value.length = 50
    save()
  }

  function removeEntry(index: number) {
    history.value.splice(index, 1)
    save()
  }

  function clearAll() {
    history.value = []
    save()
  }

  return { history, addEntry, removeEntry, clearAll }
}
