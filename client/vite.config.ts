import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-expect-error Shared JavaScript module is also used by the Vercel function.
import { addScore, topScores } from '../lib/score-store.js'

function localScoresApi(): Plugin {
  return {
    name: 'local-scores-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url?.split('?')[0] !== '/api/scores') { next(); return }
        response.setHeader('content-type', 'application/json')
        try {
          if (request.method === 'GET') {
            response.end(JSON.stringify({ leaderboard: await topScores() }))
            return
          }
          if (request.method !== 'POST') {
            response.statusCode = 405
            response.end(JSON.stringify({ error: 'Method not allowed.' }))
            return
          }
          let rawBody = ''
          for await (const chunk of request) rawBody += chunk
          const body = JSON.parse(rawBody || '{}')
          const name = String(body.name ?? '').trim().slice(0, 20)
          const levelsCleared = Number(body.levels_cleared)
          if (!name || !Number.isInteger(levelsCleared) || levelsCleared < 0 || levelsCleared > 12) {
            response.statusCode = 400
            response.end(JSON.stringify({ error: 'Invalid score.' }))
            return
          }
          response.statusCode = 201
          response.end(JSON.stringify(await addScore(name, levelsCleared)))
        } catch (error) {
          console.error(error)
          response.statusCode = 500
          response.end(JSON.stringify({ error: 'Score service unavailable.' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))
  const environment = loadEnv(mode, repositoryRoot, '')
  process.env.SUPABASE_URL = environment.SUPABASE_URL
  process.env.SUPABASE_SECRET_KEY = environment.SUPABASE_SECRET_KEY

  return {
    plugins: [react(), localScoresApi()],
    server: { host: true },
  }
})
