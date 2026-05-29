const { createClient } = require('bedrock-protocol')
const http = require('http')
const fs = require('fs')
const path = require('path')

const CACHE_DIR = './auth'
const PORT = process.env.PORT || 10000

let client = null
let reconnectTimer = null
let connecting = false
let isInServer = false
let lastPacket = Date.now()

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
  res.end('BOT ONLINE')
}).listen(PORT)

console.log('Web server attivo su porta', PORT)

function cleanupClient() {
  try {
    if (!client) return

    client.removeAllListeners()

    try {
      client.disconnect()
    } catch {}

    try {
      client.close()
    } catch {}

    client = null
  } catch {}
}

function reconnect(reason = 'unknown') {
  if (reconnectTimer) return

  console.log(`🔄 Reconnect (${reason}) tra 10 secondi...`)

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connecting = false
    isInServer = false

    cleanupClient()
    connect()
  }, 10000)
}

function connect() {
  if (connecting) return

  connecting = true
  isInServer = false

  cleanupClient()

  console.log('Tentativo di connessione...')

  try {
    client = createClient({
      host: 'procione.aternos.me',
      port: 29309,

      skipPing: true,
      profilesFolder: CACHE_DIR,

      deviceId: undefined,
      clientRandomId: Date.now()
    })

    client.on('join', () => {
      console.log('BOT ENTRATO ✔')
      lastPacket = Date.now()
    })

    client.on('spawn', () => {
      console.log('SPAWN ✔')
      connecting = false
      isInServer = true
      lastPacket = Date.now()
    })

    // aggiorna attività rete
    client.on('packet', () => {
      lastPacket = Date.now()
    })

    client.on('disconnect', (packet) => {
      console.log('DISCONNECT:', packet)

      connecting = false
      isInServer = false

      reconnect('disconnect')
    })

    client.on('error', (err) => {
      console.log('ERROR:', err?.message || err)

      connecting = false
      isInServer = false

      reconnect('error')
    })

  } catch (err) {
    console.log('Errore createClient:', err)

    connecting = false
    reconnect('crash')
  }
}

restoreAuth()
connect()

// CHECK OGNI MINUTO
setInterval(() => {
  console.log('🔍 Check stato bot...')

  const inactiveFor = Date.now() - lastPacket

  // bot fuori dal server
  if (!client || !isInServer) {
    console.log('⚠️ Bot fuori dal server')
    reconnect('health-check')
    return
  }

  // client bloccato / morto
  if (inactiveFor > 120000) {
    console.log('⚠️ Connessione inattiva da troppo tempo')
    reconnect('timeout')
    return
  }

  console.log('✅ Bot online nel server')
}, 60000)

process.on('SIGINT', () => {
  cleanupClient()
  process.exit(0)
})

process.on('SIGTERM', () => {
  cleanupClient()
  process.exit(0)
})
