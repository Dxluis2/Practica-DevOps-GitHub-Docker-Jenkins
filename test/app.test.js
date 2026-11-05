import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('La API tiene configurado el endpoint de visitas', () => {
  const codigo = readFileSync(
    new URL('../api/server.js', import.meta.url),
    'utf8'
  )

  assert.match(codigo, /\/api\/visitas/)
})

test('La API utiliza Redis', () => {
  const codigo = readFileSync(
    new URL('../api/server.js', import.meta.url),
    'utf8'
  )

  assert.match(codigo, /REDIS_URL/)
})

test('La API escucha en todas las interfaces', () => {
  const codigo = readFileSync(
    new URL('../api/server.js', import.meta.url),
    'utf8'
  )

  assert.match(codigo, /0\.0\.0\.0/)
})