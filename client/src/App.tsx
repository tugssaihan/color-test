import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Tier = 'Noob' | 'Mid' | 'Tuff' | 'Color God'
type LevelDefinition = { level: number; tier: Tier; gridSize: number; oddCount: number; delta: number }
type Round = { colors: string[]; oddIndices: number[] }
type Score = { id?: string; name: string; levels_cleared: number; created_at?: string }

const LEVELS: LevelDefinition[] = [
  { level: 1, tier: 'Noob', gridSize: 3, oddCount: 3, delta: 40 },
  { level: 2, tier: 'Noob', gridSize: 3, oddCount: 3, delta: 35 },
  { level: 3, tier: 'Noob', gridSize: 3, oddCount: 3, delta: 30 },
  { level: 4, tier: 'Mid', gridSize: 4, oddCount: 2, delta: 18 },
  { level: 5, tier: 'Mid', gridSize: 4, oddCount: 2, delta: 15 },
  { level: 6, tier: 'Mid', gridSize: 4, oddCount: 2, delta: 12 },
  { level: 7, tier: 'Tuff', gridSize: 5, oddCount: 1, delta: 6 },
  { level: 8, tier: 'Tuff', gridSize: 5, oddCount: 1, delta: 4.5 },
  { level: 9, tier: 'Tuff', gridSize: 5, oddCount: 1, delta: 3 },
  { level: 10, tier: 'Color God', gridSize: 6, oddCount: 1, delta: 2 },
  { level: 11, tier: 'Color God', gridSize: 6, oddCount: 1, delta: 1.5 },
  { level: 12, tier: 'Color God', gridSize: 6, oddCount: 1, delta: 1 },
]

function makeRound(level: LevelDefinition): Round {
  const tileCount = level.gridSize ** 2
  const baseHue = Math.floor(Math.random() * 360)
  const direction = Math.random() > .5 ? 1 : -1
  const oddHue = (baseHue + level.delta * direction + 360) % 360
  const oddIndices: number[] = []
  while (oddIndices.length < level.oddCount) {
    const candidate = Math.floor(Math.random() * tileCount)
    if (!oddIndices.includes(candidate)) oddIndices.push(candidate)
  }
  const base = `hsl(${baseHue} 67% 58%)`
  const odd = `hsl(${oddHue} 67% 58%)`
  return { colors: Array.from({ length: tileCount }, (_, index) => oddIndices.includes(index) ? odd : base), oddIndices }
}

function reactionFor(score: number) {
  if (score <= 2) return { title: 'Eyes on airplane mode', copy: "bro really said ‘i’m colorblind’ without saying it 💀" }
  if (score <= 5) return { title: 'Aggressively average', copy: "mid effort, mid eyes... it’s giving default settings" }
  if (score <= 8) return { title: 'Wait, you kinda see', copy: 'okayyy you actually got a lil eye for this, not mad at it' }
  if (score <= 11) return { title: 'Built suspiciously different', copy: 'not you almost reaching color god status fr... run it back' }
  return { title: 'The cones have spoken', copy: 'certified color god. your eyeballs need a sponsorship 🐐' }
}

function Logo() {
  return <a className="brand" href="/" aria-label="Color Showdown home"><span className="logo-splotch">C</span><span>Color<br />Showdown</span></a>
}

function App() {
  const [screen, setScreen] = useState<'start' | 'play' | 'results'>('start')
  const [levelIndex, setLevelIndex] = useState(0)
  const [round, setRound] = useState(() => makeRound(LEVELS[0]))
  const [selected, setSelected] = useState<number[]>([])
  const [cleared, setCleared] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [name, setName] = useState('')
  const [leaderboard, setLeaderboard] = useState<Score[]>([])
  const [rank, setRank] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const level = LEVELS[levelIndex]
  const reaction = useMemo(() => reactionFor(cleared), [cleared])

  const startRun = () => {
    setLevelIndex(0)
    setRound(makeRound(LEVELS[0]))
    setSelected([])
    setCleared(0)
    setFeedback(null)
    setName('')
    setLeaderboard([])
    setRank(null)
    setSubmitted(false)
    setError('')
    setScreen('play')
  }

  const toggleTile = (index: number) => {
    if (feedback) return
    setSelected((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index])
  }

  const finish = (score: number) => {
    setCleared(score)
    window.setTimeout(() => { setFeedback(null); setScreen('results') }, 480)
  }

  const checkAnswer = () => {
    if (!selected.length || feedback) return
    const correct = selected.length === round.oddIndices.length && selected.every((index) => round.oddIndices.includes(index))
    if (!correct) { setFeedback('wrong'); finish(cleared); return }
    const nextCleared = levelIndex + 1
    setCleared(nextCleared)
    setFeedback('correct')
    if (nextCleared === LEVELS.length) { finish(nextCleared); return }
    window.setTimeout(() => {
      const nextIndex = levelIndex + 1
      setLevelIndex(nextIndex)
      setRound(makeRound(LEVELS[nextIndex]))
      setSelected([])
      setFeedback(null)
    }, 360)
  }

  const submitScore = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) { setError('Drop a name first.'); return }
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/scores', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), levels_cleared: cleared }),
      })
      if (!response.ok) throw new Error('Score submission failed')
      const data = await response.json()
      setLeaderboard(data.leaderboard)
      setRank(data.rank)
      setSubmitted(true)
    } catch {
      setError('Leaderboard ghosted us. Try that again?')
    } finally { setSubmitting(false) }
  }

  return (
    <main className={`app ${feedback ? `is-${feedback}` : ''}`}>
      <header><Logo />{screen === 'play' && <button className="quit" type="button" onClick={() => finish(cleared)}>Quit run</button>}</header>

      {screen === 'start' && (
        <section className="start-screen">
          <div className="intro-block">
            <p className="tiny-note">A deeply serious eye exam*</p>
            <h1>Same-ish<br />isn’t <span>same.</span></h1>
            <p>Find the different one(s). Clear all 12 levels. Become unbearable about your color vision.</p>
            <button className="big-button" type="button" onClick={startRun}>Start the run</button>
            <small>*not medically recognized, obviously</small>
          </div>
          <div className="poster" aria-hidden="true">
            <span className="poster-tile one" /><span className="poster-tile two" /><span className="poster-tile three" />
            <b>?</b>
          </div>
        </section>
      )}

      {screen === 'play' && (
        <section className="play-screen">
          <div className="level-side">
            <p className="tier-name">{level.tier}</p>
            <div className="level-number"><span>Level</span>{String(level.level).padStart(2, '0')}</div>
            <div className="progress-dots" aria-label={`${cleared} of 12 levels cleared`}>
              {LEVELS.map((item, index) => <i key={item.level} className={index < cleared ? 'done' : index === levelIndex ? 'now' : ''} />)}
            </div>
            <p className="instruction">Find the different one(s). Tap your picks, then lock them in.</p>
          </div>
          <div className="board-side">
            <div className="tile-grid" style={{ gridTemplateColumns: `repeat(${level.gridSize}, 1fr)` }} aria-label={`Level ${level.level} color grid`}>
              {round.colors.map((color, index) => (
                <button key={`${level.level}-${index}`} className={`color-tile ${selected.includes(index) ? 'selected' : ''}`} style={{ backgroundColor: color }} type="button" onClick={() => toggleTile(index)} disabled={Boolean(feedback)} aria-pressed={selected.includes(index)} aria-label={`Tile ${index + 1}`} />
              ))}
            </div>
            <button className="submit-picks" type="button" onClick={checkAnswer} disabled={!selected.length || Boolean(feedback)}>{feedback === 'correct' ? 'Yep, nailed it!' : feedback === 'wrong' ? 'Oof. Nope.' : 'Lock in my picks'}</button>
          </div>
        </section>
      )}

      {screen === 'results' && (
        <section className="results-screen">
          <div className="roast-panel">
            <p className="result-label">Run complete</p>
            <div className="final-score"><strong>{cleared}</strong><span>levels<br />cleared</span></div>
            <h1>{reaction.title}</h1>
            <p className="reaction">{reaction.copy}</p>
            <button className="again-button" type="button" onClick={startRun}>Try again</button>
          </div>
          <div className="leaderboard-panel">
            {!submitted ? (
              <form onSubmit={submitScore}>
                <h2>Make it official</h2>
                <p>Put your run on the global leaderboard.</p>
                <label htmlFor="score-name">Name</label>
                <input id="score-name" value={name} onChange={(event) => setName(event.target.value.slice(0, 20))} placeholder="internet celebrity name" maxLength={20} />
                <button type="submit" disabled={submitting}>{submitting ? 'Posting...' : 'Post my score'}</button>
                {error && <p className="form-error" role="alert">{error}</p>}
              </form>
            ) : (
              <div className="leaderboard">
                <div className="rank-sticker">You landed #{rank}</div>
                <h2>Top ten eyeballs</h2>
                <ol>
                  {leaderboard.map((score, index) => <li key={score.id ?? `${score.name}-${index}`}><span><b>{index + 1}</b>{score.name}</span><strong>{score.levels_cleared}</strong></li>)}
                </ol>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  )
}

export default App
