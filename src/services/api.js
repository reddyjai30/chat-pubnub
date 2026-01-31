import axios from 'axios'

const DEFAULT_TIP_URL = 'https://dummyjson.com/quotes/random'

export async function fetchDailyTip() {
  const url = import.meta.env.VITE_TIP_API_URL || DEFAULT_TIP_URL
  const response = await axios.get(url, { timeout: 6000 })
  const payload = response?.data

  if (!payload) {
    throw new Error('Empty response from tip API')
  }

  if (payload.quote) {
    return { text: payload.quote, author: payload.author || 'Unknown' }
  }

  if (payload.text) {
    return { text: payload.text, author: payload.author || 'Unknown' }
  }

  return { text: 'Stay connected and keep responses clear and empathetic.', author: 'Team Tip' }
}
