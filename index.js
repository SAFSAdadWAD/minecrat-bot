const { createClient } = require('bedrock-protocol')
const http = require('http')
const fs = require('fs')
const path = require('path')

const CACHE_DIR = './auth'
const PORT = process.env.PORT || 3000

let client = null
let reconnecting = false

function restoreAuth() {
  try {
    if (!process.env.AUTH_DATA) return

    const data = JSON.parse(process.env.AUTH_DATA)

    fs.mkdirSync(CACHE_DIR, { recursive: true })

    for (const [k, v] of Object.entries(data)) {
      fs.writeFileSync(
        path.join(CACHE_DIR, k),
        JSON.stringify(v)
      )
    }

    console.log('Token ripristinato ✔')
  } catch (e) {
    console.log('Errore auth:', e.message)
  }
}

http.createServer((req, res) => {
  res.end('OK')
}).listen(PORT)

console.log('Web server attivo su porta', PORT)

function connect() {
  console.log('Tentativo di connessione...')

  client = createClient({
    host: 'procione.aternos.me',
    port: 29309,

    skipPing: true,
    profilesFolder: CACHE_DIR,

    deviceId: undefined,
    clientRandomId: undefined
  })

  client.on('join', () => {
    console.log('BOT ENTRATO ✔')
  })

  client.on('spawn', () => {
    console.log('SPAWN ✔')
  })

  client.on('disconnect', (p) => {
    console.log('DISCONNECT:', p)
    scheduleReconnect()
  })

  client.on('error', (err) => {
    console.log('ERROR:', err?.message || err)
    scheduleReconnect()
  })
}

function scheduleReconnect() {
  if (reconnecting) return

  reconnecting = true

  console.log('🔄 Riconnessione tra 5 secondi...')

  setTimeout(() => {
    reconnecting = false

    try {
      if (client) {
        client.removeAllListeners()
        client = null
      }
    } catch {}

    connect()
  }, 5000)
}

restoreAuth()
connect()
