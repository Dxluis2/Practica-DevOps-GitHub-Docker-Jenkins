
import express from 'express'
import { createClient } from 'redis'

const app = express()
const PORT = process.env.PORT || 3000

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
})

redis.on('error', (error) => {
  console.error('Error de Redis:', error.message)
})

app.get('/health', (req, res) => {
  res.json({
    estado: 'ok',
    aplicacion: 'Agenda Escolar DevOps'
  })
})

app.get('/api/visitas', async (req, res) => {
  try {
    if (!redis.isReady) {
      return res.status(503).json({
        error: 'Redis no esta disponible'
      })
    }

    const visitas = await redis.incr('agenda:visitas')

    res.json({
      mensaje: 'Contador de visitas de Agenda Escolar',
      visitas
    })
  } catch (error) {
    res.status(500).json({
      error: 'No se pudo consultar Redis'
    })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API ejecutandose en el puerto ${PORT}`)
})

redis.connect().catch((error) => {
  console.error('No se pudo conectar a Redis:', error.message)
})
