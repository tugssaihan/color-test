import http from 'node:http'
import { addScore, topScores } from './score-store.js'

const PORT = Number(process.env.PORT) || 8787
function json(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' })
  response.end(JSON.stringify(payload))
}
async function readJson(request) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (body.length > 10_000) throw new Error('Body too large')
  }
  return JSON.parse(body || '{}')
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' })
    response.end()
    return
  }
  try {
    if (request.url === '/health') { json(response, 200, { ok: true }); return }
    if (request.url === '/api/scores' && request.method === 'GET') { json(response, 200, { leaderboard: await topScores() }); return }
    if (request.url === '/api/scores' && request.method === 'POST') {
      const body = await readJson(request)
      const name = String(body.name ?? '').trim().slice(0, 20)
      const levelsCleared = Number(body.levels_cleared)
      if (!name || !Number.isInteger(levelsCleared) || levelsCleared < 0 || levelsCleared > 12) { json(response, 400, { error: 'Invalid score.' }); return }
      json(response, 201, await addScore(name, levelsCleared))
      return
    }
    json(response, 404, { error: 'Not found.' })
  } catch (error) {
    console.error(error)
    json(response, 500, { error: 'Score service unavailable.' })
  }
})
server.listen(PORT, () => console.log(`Color Showdown API listening on http://localhost:${PORT}`))
