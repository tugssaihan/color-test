import http from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'

const PORT = Number(process.env.PORT) || 8787
const rooms = new Map()
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const server = http.createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ ok: true, rooms: rooms.size }))
    return
  }
  response.writeHead(404, { 'content-type': 'application/json' })
  response.end(JSON.stringify({ error: 'Not found' }))
})

const wss = new WebSocketServer({ server, path: '/socket' })

function createCode() {
  let code = ''
  do {
    code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')
  } while (rooms.has(code))
  return code
}

function publicPlayers(room) {
  return room.players.map(({ id, username, score, finished }) => ({ id, username, score, finished }))
}

function send(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload))
}

function broadcast(room, payload) {
  room.players.forEach((player) => send(player.socket, payload))
}

function makeRound(level) {
  const baseHue = Math.floor(Math.random() * 360)
  const delta = Math.max(2, 26 - level * 2)
  const direction = Math.random() > 0.5 ? 1 : -1
  const oddHue = (baseHue + direction * delta + 360) % 360
  const oddIndex = Math.floor(Math.random() * 9)
  const baseColor = `hsl(${baseHue} 55% 55%)`
  const oddColor = `hsl(${oddHue} 55% 55%)`
  const colors = Array.from({ length: 9 }, (_, index) => index === oddIndex ? oddColor : baseColor)
  return { level, colors, oddIndex }
}

function getRound(room, level) {
  if (!room.rounds.has(level)) room.rounds.set(level, makeRound(level))
  return room.rounds.get(level)
}

function startGame(room) {
  room.status = 'playing'
  room.rounds = new Map()
  room.players.forEach((player) => {
    player.score = 0
    player.level = 1
    player.finished = false
  })
  room.players.forEach((player) => send(player.socket, {
    type: 'game_started', roomCode: room.code, playerId: player.id,
    players: publicPlayers(room), round: getRound(room, 1),
  }))
}

function finishIfReady(room) {
  if (!room.players.every((player) => player.finished)) return
  room.status = 'finished'
  const [first, second] = room.players
  const winnerId = first.score === second.score ? null : first.score > second.score ? first.id : second.id
  broadcast(room, { type: 'match_finished', results: { players: publicPlayers(room), winnerId } })
}

function finishPlayer(room, player) {
  player.finished = true
  broadcast(room, { type: 'player_finished', playerId: player.id, players: publicPlayers(room) })
  finishIfReady(room)
}

function handleMessage(socket, rawMessage) {
  let message
  try { message = JSON.parse(rawMessage.toString()) }
  catch { send(socket, { type: 'error', message: 'Invalid message.' }); return }

  if (message.type === 'create_room') {
    const username = String(message.username ?? '').trim().slice(0, 20)
    if (!username) { send(socket, { type: 'error', message: 'Username is required.' }); return }
    const code = createCode()
    const player = { id: crypto.randomUUID(), username, score: 0, level: 1, finished: false, socket }
    const room = { code, status: 'waiting', players: [player], rounds: new Map() }
    rooms.set(code, room)
    socket.roomCode = code
    socket.playerId = player.id
    send(socket, { type: 'room_created', roomCode: code, playerId: player.id, players: publicPlayers(room) })
    return
  }

  if (message.type === 'join_room') {
    const username = String(message.username ?? '').trim().slice(0, 20)
    const code = String(message.roomCode ?? '').trim().toUpperCase()
    const room = rooms.get(code)
    if (!username) { send(socket, { type: 'error', message: 'Username is required.' }); return }
    if (!room) { send(socket, { type: 'error', message: 'Room not found. Check the code and try again.' }); return }
    if (room.players.length >= 2 || room.status !== 'waiting') { send(socket, { type: 'error', message: 'That room is already full.' }); return }
    const player = { id: crypto.randomUUID(), username, score: 0, level: 1, finished: false, socket }
    room.players.push(player)
    socket.roomCode = code
    socket.playerId = player.id
    startGame(room)
    return
  }

  const room = rooms.get(socket.roomCode)
  const player = room?.players.find((candidate) => candidate.id === socket.playerId)
  if (!room || !player) { send(socket, { type: 'error', message: 'You are not in a room.' }); return }

  if (message.type === 'answer') {
    if (room.status !== 'playing' || player.finished) return
    if (Number(message.level) !== player.level) { send(socket, { type: 'error', message: 'That round has already moved on.' }); return }
    const round = getRound(room, player.level)
    const correct = Number(message.index) === round.oddIndex
    send(socket, { type: 'answer_result', message: correct ? 'correct' : 'wrong' })
    if (!correct) { finishPlayer(room, player); return }
    player.score = player.level
    player.level += 1
    broadcast(room, { type: 'progress', players: publicPlayers(room) })
    send(socket, { type: 'round', round: getRound(room, player.level) })
    return
  }

  if (message.type === 'stop') {
    if (room.status === 'playing' && !player.finished) finishPlayer(room, player)
    return
  }

  if (message.type === 'rematch' && room.status === 'finished' && room.players.length === 2) startGame(room)
}

wss.on('connection', (socket) => {
  socket.on('message', (message) => handleMessage(socket, message))
  socket.on('close', () => {
    const room = rooms.get(socket.roomCode)
    if (!room) return
    room.players = room.players.filter((player) => player.id !== socket.playerId)
    if (room.players.length === 0) rooms.delete(room.code)
    else {
      room.status = 'interrupted'
      broadcast(room, { type: 'opponent_left' })
      setTimeout(() => rooms.delete(room.code), 30_000)
    }
  })
})

server.listen(PORT, () => console.log(`Color Showdown server listening on http://localhost:${PORT}`))
