import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Player = { id: string; username: string; score: number; finished: boolean }
type Round = { level: number; colors: string[]; oddIndex: number }
type Results = { players: Player[]; winnerId: string | null }
type ServerMessage = {
  type: string
  roomCode?: string
  playerId?: string
  players?: Player[]
  round?: Round
  results?: Results
  message?: string
}
type Screen = 'landing' | 'waiting' | 'playing' | 'results' | 'opponent-left'
type Flash = 'correct' | 'wrong' | null

const socketUrl = import.meta.env.VITE_WS_URL || `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/socket`

function LogoMark() {
  return <span className="logo-mark" aria-hidden="true"><i /><i /><i /><i /></span>
}

function App() {
  const socketRef = useRef<WebSocket | null>(null)
  const playerIdRef = useRef('')
  const [screen, setScreen] = useState<Screen>('landing')
  const [username, setUsername] = useState('')
  const [roomInput, setRoomInput] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [round, setRound] = useState<Round | null>(null)
  const [results, setResults] = useState<Results | null>(null)
  const [error, setError] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [flash, setFlash] = useState<Flash>(null)
  const [locked, setLocked] = useState(false)

  useEffect(() => () => socketRef.current?.close(), [])

  const handleMessage = (event: MessageEvent) => {
    const message = JSON.parse(event.data) as ServerMessage
    if (message.type === 'room_created') {
      setRoomCode(message.roomCode ?? '')
      setPlayerId(message.playerId ?? '')
      playerIdRef.current = message.playerId ?? ''
      setPlayers(message.players ?? [])
      setScreen('waiting')
    }
    if (message.type === 'game_started') {
      setRoomCode(message.roomCode ?? roomCode)
      setPlayerId((current) => message.playerId ?? current)
      if (message.playerId) playerIdRef.current = message.playerId
      setPlayers(message.players ?? [])
      setRound(message.round ?? null)
      setResults(null)
      setLocked(false)
      setFlash(null)
      setScreen('playing')
    }
    if (message.type === 'round') {
      setRound(message.round ?? null)
      setLocked(false)
    }
    if (message.type === 'progress') setPlayers(message.players ?? [])
    if (message.type === 'answer_result') {
      const wasCorrect = message.message === 'correct'
      setFlash(wasCorrect ? 'correct' : 'wrong')
      window.setTimeout(() => setFlash(null), 420)
    }
    if (message.type === 'player_finished') {
      setPlayers(message.players ?? [])
      const currentPlayer = message.players?.find((player) => player.id === playerIdRef.current)
      if (currentPlayer?.finished) setLocked(true)
    }
    if (message.type === 'match_finished') {
      setResults(message.results ?? null)
      setPlayers(message.results?.players ?? [])
      setScreen('results')
    }
    if (message.type === 'opponent_left') setScreen('opponent-left')
    if (message.type === 'error') {
      setError(message.message ?? 'Something went wrong. Try again.')
      setConnecting(false)
      if (!playerIdRef.current) socketRef.current?.close()
    }
  }

  const connectAndSend = (action: 'create_room' | 'join_room') => {
    const name = username.trim()
    if (!name) return setError('Enter a username to continue.')
    if (action === 'join_room' && roomInput.trim().length !== 4) return setError('Enter the 4-character room code.')
    setConnecting(true)
    setError('')
    const socket = new WebSocket(socketUrl)
    socketRef.current = socket
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: action, username: name, roomCode: roomInput.trim().toUpperCase() }))
      setConnecting(false)
    })
    socket.addEventListener('message', handleMessage)
    socket.addEventListener('error', () => {
      setError('Could not reach the game server. Is it running?')
      setConnecting(false)
    })
  }

  const submitJoin = (event: FormEvent) => {
    event.preventDefault()
    connectAndSend('join_room')
  }
  const chooseTile = (index: number) => {
    if (locked || !round) return
    setLocked(true)
    socketRef.current?.send(JSON.stringify({ type: 'answer', index, level: round.level }))
  }
  const stopHere = () => {
    if (locked) return
    setLocked(true)
    socketRef.current?.send(JSON.stringify({ type: 'stop' }))
  }
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(roomCode) }
    catch { setError('Could not copy automatically. Select the code instead.') }
  }

  const me = players.find((player) => player.id === playerId)
  const opponent = players.find((player) => player.id !== playerId)
  const currentScore = me?.score ?? 0

  return (
    <main className={`app ${flash ? `flash-${flash}` : ''}`}>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Color Showdown home"><LogoMark /><span>COLOR<br />SHOWDOWN</span></a>
        {roomCode && screen !== 'landing' && <div className="room-pill"><span>Room</span> {roomCode}</div>}
      </header>

      {screen === 'landing' && (
        <section className="landing panel" aria-labelledby="landing-title">
          <div className="eyebrow"><span /> 1V1 COLOR DUEL</div>
          <h1 id="landing-title">One shade is<br /><em>different.</em></h1>
          <p className="intro">Spot it before your opponent does. Every round gets harder. One mistake ends your run.</p>
          <label className="field-label" htmlFor="username">Your username</label>
          <input id="username" className="text-input" value={username} onChange={(event) => setUsername(event.target.value.slice(0, 20))} placeholder="e.g. chroma_king" autoComplete="nickname" />
          <button className="primary-button" type="button" disabled={connecting} onClick={() => connectAndSend('create_room')}><span>Create a room</span><b aria-hidden="true">↗</b></button>
          <div className="divider"><span>or join a friend</span></div>
          <form className="join-form" onSubmit={submitJoin}>
            <input className="code-input" value={roomInput} onChange={(event) => setRoomInput(event.target.value.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase())} placeholder="ROOM CODE" aria-label="Room code" maxLength={4} />
            <button className="join-button" type="submit" disabled={connecting}>Join room</button>
          </form>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="how-it-works" aria-label="How it works">
            <span><b>01</b> Find the odd tile</span><i>→</i><span><b>02</b> Keep your run alive</span><i>→</i><span><b>03</b> Highest score wins</span>
          </div>
        </section>
      )}

      {screen === 'waiting' && (
        <section className="waiting panel" aria-labelledby="waiting-title">
          <div className="radar" aria-hidden="true"><LogoMark /></div>
          <div className="eyebrow"><span /> ROOM CREATED</div>
          <h1 id="waiting-title">Waiting for<br /><em>your rival.</em></h1>
          <p className="intro">Share this code with the person you want to challenge.</p>
          <button className="room-code" type="button" onClick={copyCode} aria-label={`Copy room code ${roomCode}`}><span>{roomCode}</span><small>Click to copy</small></button>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="waiting-line"><span /> Listening for player two</div>
        </section>
      )}

      {screen === 'playing' && round && (
        <section className="game" aria-labelledby="round-title">
          <div className="score-row">
            <div className="score-card is-you"><span className="player-label">You</span><strong>{me?.username}</strong><b>{currentScore}</b></div>
            <div className="versus">VS</div>
            <div className="score-card"><span className="player-label">Opponent</span><strong>{opponent?.username ?? 'Waiting…'}</strong><b>{opponent?.score ?? 0}</b></div>
          </div>
          <div className="round-heading"><div><span>Round</span><h1 id="round-title">{String(round.level).padStart(2, '0')}</h1></div><p>Find the tile with<br />a different hue.</p></div>
          <div className="tile-grid" aria-label={`Round ${round.level} color grid`}>
            {round.colors.map((color, index) => <button className="color-tile" key={`${round.level}-${index}`} type="button" style={{ backgroundColor: color }} onClick={() => chooseTile(index)} disabled={locked} aria-label={`Color tile ${index + 1}`} />)}
          </div>
          {me?.finished ? <div className="finished-note"><span className="spinner" /> Run complete — waiting for {opponent?.username}</div> : <button className="stop-button" type="button" onClick={stopHere} disabled={locked && !flash}>Stop here · bank {currentScore}</button>}
        </section>
      )}

      {screen === 'results' && results && (
        <section className="results panel" aria-labelledby="results-title">
          <div className="eyebrow"><span /> FINAL SCORE</div>
          <h1 id="results-title">{results.winnerId === null ? 'Dead even.' : results.winnerId === playerId ? 'You win.' : `${opponent?.username} wins.`}</h1>
          <p className="intro">{results.winnerId === null ? 'Same eyes. Same score. Settle it with another round.' : 'The sharpest eyes take this showdown.'}</p>
          <div className="result-grid">
            {results.players.map((player) => <article className={player.id === results.winnerId ? 'winner' : ''} key={player.id}><span>{player.id === playerId ? 'You' : 'Opponent'}</span><strong>{player.username}</strong><b>{player.score}</b><small>{player.id === results.winnerId ? 'Winner' : results.winnerId === null ? 'Tie' : 'Final score'}</small></article>)}
          </div>
          <button className="primary-button" type="button" onClick={() => socketRef.current?.send(JSON.stringify({ type: 'rematch' }))}><span>Play a rematch</span><b aria-hidden="true">↻</b></button>
          <p className="rematch-note">Either player can start the next showdown.</p>
        </section>
      )}

      {screen === 'opponent-left' && (
        <section className="waiting panel" aria-labelledby="left-title">
          <div className="eyebrow danger"><span /> CONNECTION LOST</div>
          <h1 id="left-title">Your rival<br /><em>left the room.</em></h1>
          <p className="intro">This showdown is over. Head back and create a new room when you’re ready.</p>
          <button className="primary-button" type="button" onClick={() => location.reload()}><span>Back to lobby</span><b>↗</b></button>
        </section>
      )}
      <footer><span>COLOR SHOWDOWN</span><span>Spot the difference. Own the room.</span></footer>
    </main>
  )
}

export default App
