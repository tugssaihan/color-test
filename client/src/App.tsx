import { useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Tier = 'Noob' | 'Mid' | 'Tuff' | 'Color Goat'
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
  { level: 10, tier: 'Color Goat', gridSize: 6, oddCount: 1, delta: 2 },
  { level: 11, tier: 'Color Goat', gridSize: 6, oddCount: 1, delta: 1.5 },
  { level: 12, tier: 'Color Goat', gridSize: 6, oddCount: 1, delta: 1 },
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

const REACTIONS = {
  brutal: [
    { title: 'Did you play with your elbows?', copy: 'the odd tile was basically wearing a name tag and you still walked past it 💀' },
    { title: 'Your eyes need DLC', copy: 'bro downloaded vision but forgot to install the color pack' },
    { title: 'Witness protection vision', copy: 'you saw absolutely nothing and honestly that level of commitment is impressive' },
    { title: 'The squares cooked you', copy: 'nine rectangles just ended your entire bloodline’s reputation' },
    { title: 'Blink twice if you need help', copy: 'actually never mind, blinking might make the score worse' },
    { title: 'Achievement unlocked: looked', copy: 'seeing was apparently part of the premium battle pass' },
    { title: 'Bro guessed in 4K', copy: 'all those pixels on the screen and not one reached the brain' },
    { title: 'Color said boo', copy: 'and your entire visual system folded like a lawn chair' },
    { title: 'The tutorial filed a complaint', copy: 'it explained everything and somehow feels personally ignored' },
    { title: 'Eyes by Temu', copy: 'they arrived fast, looked convincing, and stopped working immediately' },
  ],
  mid: [
    { title: 'Factory settings behavior', copy: 'congratulations, your eyes perform exactly as advertised and not a pixel more' },
    { title: 'Color intern of the month', copy: 'unpaid, underqualified, but somehow still invited to the meeting' },
    { title: 'A powerful 5 out of maybe', copy: 'not bad enough to roast at dinner, not good enough to mention either' },
    { title: 'Your cones took PTO', copy: 'they answered three emails, moved the mouse once, then disappeared' },
    { title: 'Microwave chef performance', copy: 'you technically cooked, but nobody is asking for the recipe' },
    { title: 'A solid C-minus in seeing', copy: 'the assignment was submitted. that is the nicest thing we can say' },
    { title: 'Premium mediocrity', copy: 'this score came with heated seats and absolutely no horsepower' },
    { title: 'Almost worth bragging about', copy: 'just remove the score, the context, and everyone who watched' },
    { title: 'You beat the allegations. Barely.', copy: 'the jury still has several questions about level four' },
    { title: 'Decent-ish detected', copy: 'your eyes showed up wearing business casual and did the minimum' },
  ],
  respect: [
    { title: 'Okay Hawkeye, relax', copy: 'we get it, your cones have a gym membership' },
    { title: 'Suspiciously functional eyeballs', copy: 'finally, a pair of organs earning their place on the payroll' },
    { title: 'You cooked. Lightly.', copy: 'not a five-star meal, but the smoke alarm stayed quiet' },
    { title: 'Optometrist’s favorite child', copy: 'this score is getting printed and taped to the fridge' },
    { title: 'Main character vision', copy: 'you spotted enough pixels to unlock a mildly dramatic montage' },
    { title: 'Cones with benefits', copy: 'your eyeballs are clearly in a committed professional relationship' },
    { title: 'Actually not embarrassing', copy: 'screenshots are permitted. captions should remain humble' },
    { title: 'Neighborhood color expert', copy: 'qualified to settle arguments at the paint aisle, nothing international yet' },
    { title: 'The pixels respect you', copy: 'they did not surrender, but they definitely stopped laughing' },
    { title: 'Lowkey built for this', copy: 'highkey still two levels away from becoming unbearable' },
  ],
  hype: [
    { title: 'Please nerf this person', copy: 'the developers did not balance the game around your government-issued eagle eyes' },
    { title: 'Your retina has wallhacks', copy: 'be honest, which eye is running the cheat client?' },
    { title: 'Pantone is typing...', copy: 'they want their entire company back because apparently you can do it alone' },
    { title: 'Colors cannot hide from you', copy: 'every hue just changed its privacy settings' },
    { title: 'One hoof from greatness', copy: 'the Color Goat throne is warm. run it back and claim it' },
    { title: 'Human eyedropper tool', copy: 'designers are dragging you around the screen to sample colors now' },
    { title: 'Retina with a résumé', copy: 'skills include hue detection, pixel intimidation, and making friends feel inadequate' },
    { title: 'The RGB council noticed', copy: 'your application is under review and red already voted yes' },
    { title: 'Unreasonably observant', copy: 'you are one level away from noticing when websites move a button by one pixel' },
    { title: 'Final boss optometrist', copy: 'the eye chart has started studying for you' },
  ],
  god: [
    { title: 'Certified Color Goat 🐐', copy: 'the visible spectrum has been legally transferred into your name' },
    { title: 'Pantone’s new CEO', copy: 'your first order of business is firing every color that tried to hide' },
    { title: 'Biblically accurate eyesight', copy: 'do not be afraid. unless you are a slightly different square' },
    { title: 'The pixels confessed', copy: 'you looked at them once and they immediately told you everything' },
    { title: 'Your eyes have patch notes', copy: 'version 12.0: removed weakness, added frightening amounts of color knowledge' },
    { title: 'Color Goat behavior 🐐', copy: 'you did not find the odd tiles. they presented themselves out of respect' },
    { title: 'Retina of the year', copy: 'the award ceremony is just every optometrist standing and clapping' },
    { title: 'Too powerful for hex codes', copy: 'you simply look at a color and it tells you its full government name' },
    { title: 'The spectrum chose you', copy: 'red, green, and blue have agreed to follow you into battle' },
    { title: 'Illegal levels of vision', copy: 'your cones have been reported to the appropriate authorities' },
  ],
} as const

function reactionFor(score: number) {
  const pool = score <= 2 ? REACTIONS.brutal : score <= 5 ? REACTIONS.mid : score <= 8 ? REACTIONS.respect : score <= 11 ? REACTIONS.hype : REACTIONS.god
  return pool[Math.floor(Math.random() * pool.length)]
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
  const [reaction, setReaction] = useState(() => reactionFor(0))

  const level = LEVELS[levelIndex]

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
    setReaction(reactionFor(score))
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
