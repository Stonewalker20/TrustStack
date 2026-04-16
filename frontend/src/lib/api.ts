import axios from 'axios'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL
const localFallbackBaseUrls = ['http://127.0.0.1:8000', 'http://127.0.0.1:8001']
const defaultBaseUrl = configuredBaseUrl || localFallbackBaseUrls[0]

export const api = axios.create({
  baseURL: defaultBaseUrl,
})

api.interceptors.response.use(undefined, async (error) => {
  if (configuredBaseUrl) {
    throw error
  }

  const config = error.config
  if (!config || config.__retriedWithLocalFallback) {
    throw error
  }

  if (error.response) {
    throw error
  }

  const currentBaseUrl = config.baseURL || defaultBaseUrl
  const nextBaseUrl = localFallbackBaseUrls.find((candidate) => candidate !== currentBaseUrl)
  if (!nextBaseUrl) {
    throw error
  }

  config.__retriedWithLocalFallback = true
  config.baseURL = nextBaseUrl
  api.defaults.baseURL = nextBaseUrl

  return api.request(config)
})
