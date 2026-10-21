import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 12000,
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('merite_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError<{ message?: string }>(error) && error.response?.status === 401) {
      sessionStorage.removeItem('merite_token')
      sessionStorage.removeItem('merite_user')
      window.dispatchEvent(new Event('merite:unauthorized'))
    }
    if (axios.isAxiosError<{ message?: string }>(error)) {
      const message = error.response?.data?.message
      return Promise.reject(new Error(message || error.message))
    }
    return Promise.reject(error)
  },
)
