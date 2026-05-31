import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

export async function createComparison(data, { force = false } = {}) {
  const url = force ? '/comparisons?force=true' : '/comparisons'
  const response = await api.post(url, data)
  return response.data
}

export async function getComparison(taskId) {
  const response = await api.get(`/comparisons/${taskId}`)
  return response.data
}

export async function listComparisons(params = {}) {
  const response = await api.get('/comparisons', { params })
  // Backwards compatible: if it returns an array directly, use it as items
  if (Array.isArray(response.data)) return response.data
  // New paginated format: { items, total, page, page_size }
  return response.data.items || response.data
}

export async function probeUrl(url) {
  const response = await api.get('/comparisons/probe', { params: { url } })
  return response.data
}

export async function deleteComparison(taskId) {
  await api.delete(`/comparisons/${taskId}`)
}
