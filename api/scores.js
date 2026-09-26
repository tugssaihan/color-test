import { addScore, topScores } from '../server/src/score-store.js'

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') { response.status(200).json({ leaderboard: await topScores() }); return }
    if (request.method !== 'POST') { response.setHeader('allow', 'GET, POST'); response.status(405).json({ error: 'Method not allowed.' }); return }
    const name = String(request.body?.name ?? '').trim().slice(0, 20)
    const levelsCleared = Number(request.body?.levels_cleared)
    if (!name || !Number.isInteger(levelsCleared) || levelsCleared < 0 || levelsCleared > 12) { response.status(400).json({ error: 'Invalid score.' }); return }
    response.status(201).json(await addScore(name, levelsCleared))
  } catch (error) {
    console.error(error)
    response.status(500).json({ error: 'Score service unavailable.' })
  }
}
