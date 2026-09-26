import assert from 'node:assert/strict'
import WebSocket from 'ws'

function makeClient() {
  const socket = new WebSocket('ws://localhost:8787/socket')
  const queue = []
  const waiters = []
  socket.on('message', (data) => {
    const message = JSON.parse(data.toString())
    const waiterIndex = waiters.findIndex((waiter) => waiter.type === message.type)
    if (waiterIndex >= 0) waiters.splice(waiterIndex, 1)[0].resolve(message)
    else queue.push(message)
  })
  return {
    socket,
    opened: new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject) }),
    send: (message) => socket.send(JSON.stringify(message)),
    next(type) {
      const queuedIndex = queue.findIndex((message) => message.type === type)
      if (queuedIndex >= 0) return Promise.resolve(queue.splice(queuedIndex, 1)[0])
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${type}`)), 2000)
        waiters.push({ type, resolve: (message) => { clearTimeout(timer); resolve(message) } })
      })
    },
  }
}

const first = makeClient()
const second = makeClient()
await Promise.all([first.opened, second.opened])
first.send({ type: 'create_room', username: 'Iris' })
const created = await first.next('room_created')
assert.match(created.roomCode, /^[A-Z2-9]{4}$/)

second.send({ type: 'join_room', username: 'Hue' , roomCode: created.roomCode })
const [firstStart, secondStart] = await Promise.all([first.next('game_started'), second.next('game_started')])
assert.deepEqual(firstStart.round, secondStart.round)
assert.equal(firstStart.players.length, 2)

first.send({ type: 'answer', level: 1, index: firstStart.round.oddIndex })
await first.next('answer_result')
const secondRound = await first.next('round')
assert.equal(secondRound.round.level, 2)

second.send({ type: 'stop' })
await second.next('player_finished')
first.send({ type: 'stop' })
const [firstResult, secondResult] = await Promise.all([first.next('match_finished'), second.next('match_finished')])
assert.deepEqual(firstResult.results, secondResult.results)
assert.equal(firstResult.results.winnerId, firstStart.playerId)

first.send({ type: 'rematch' })
const [firstRematch, secondRematch] = await Promise.all([first.next('game_started'), second.next('game_started')])
assert.equal(firstRematch.round.level, 1)
assert.deepEqual(firstRematch.round, secondRematch.round)

first.socket.close()
second.socket.close()
console.log('Two-player smoke test passed')
