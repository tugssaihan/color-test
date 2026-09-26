import assert from 'node:assert/strict'

const endpoint = 'http://localhost:8787/api/scores'
const created = await fetch(endpoint, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'PrismKid', levels_cleared: 8 }),
})
assert.equal(created.status, 201)
const result = await created.json()
assert.equal(result.entry.levels_cleared, 8)
assert.ok(result.rank >= 1)
const list = await fetch(endpoint).then((response) => response.json())
assert.equal(list.leaderboard[0].name, 'PrismKid')
console.log('Leaderboard API smoke test passed')
