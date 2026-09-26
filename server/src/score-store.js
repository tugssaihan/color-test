const memoryScores = []

function supabaseHeaders(extra = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return { apikey: key, authorization: `Bearer ${key}`, ...extra }
}

function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, { ...options, headers: supabaseHeaders(options.headers) })
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`)
  return response
}

export async function topScores() {
  if (!hasSupabase()) return [...memoryScores].sort((a, b) => b.levels_cleared - a.levels_cleared || a.created_at.localeCompare(b.created_at)).slice(0, 10)
  const response = await supabaseRequest('scores?select=id,name,levels_cleared,created_at&order=levels_cleared.desc,created_at.asc&limit=10')
  return response.json()
}

export async function addScore(name, levelsCleared) {
  if (!hasSupabase()) {
    const entry = { id: crypto.randomUUID(), name, levels_cleared: levelsCleared, created_at: new Date().toISOString() }
    memoryScores.push(entry)
    const ordered = [...memoryScores].sort((a, b) => b.levels_cleared - a.levels_cleared || a.created_at.localeCompare(b.created_at))
    return { entry, leaderboard: ordered.slice(0, 10), rank: ordered.findIndex((score) => score.id === entry.id) + 1 }
  }
  const inserted = await supabaseRequest('scores', {
    method: 'POST', headers: { 'content-type': 'application/json', prefer: 'return=representation' },
    body: JSON.stringify({ name, levels_cleared: levelsCleared }),
  }).then((response) => response.json())
  const entry = inserted[0]
  const countResponse = await supabaseRequest(`scores?select=id&levels_cleared=gt.${levelsCleared}`, { method: 'HEAD', headers: { prefer: 'count=exact' } })
  const greaterCount = Number(countResponse.headers.get('content-range')?.split('/')[1] ?? 0)
  return { entry, leaderboard: await topScores(), rank: greaterCount + 1 }
}
