import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle errors globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.data && !err.response.data.message && err.response.data.detail) {
      err.response.data.message = typeof err.response.data.detail === 'string'
        ? err.response.data.detail
        : JSON.stringify(err.response.data.detail)
    }
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/teacher/login'
    }
    return Promise.reject(err)
  }
)

export default api
