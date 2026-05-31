const { createClient } = require('bedrock-protocol')
const http = require('http')
const fs = require('fs')
const path = require('path')

const CACHE_DIR = './auth'
const PORT = process.env.PORT || 10000

let client = null
let reconnecting = false
let isInServer = false
let lastActivity = Date.now()
let reconnectAttempts = 0

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

// HTTP server (keep alive Render + UptimeRobot)
http.createServer((req, res) => {
  res.end('BOT ONLINE')
}).listen(PORT)

console.log('Web server attivo su porta', PORT)

function destroyClient() {
  if (!client) return

  console.log('🧹 Distruggo client...')

  try { client.removeAllListeners() } catch {}
  try { client.disconnect() } catch {}
  try { client.close() } catch {}
  try { client.socket?.close?.() } catch {}

  client = null
  isInServer = false
}

function scheduleReconnect(reason = 'unknown') {
  if (reconnecting) return

  reconnecting = true
  reconnectAttempts++

  const delay = Math.min(5000 + reconnectAttempts * 2000, 30000)

  console.log(`🔄 Reconnect tra ${delay}ms (${reason})`)

  destroyClient()

  setTimeout(() => {
    reconnecting = false
    connect()
  }, delay)
}

function connect() {
  console.log('🚀 Connessione bot...')

  destroyClient()

  isInServer = false
  lastActivity = Date.now()

  try {
    client = createClient({
      host: 'procione.aternos.me',
      port: 29309,
      profilesFolder: CACHE_DIR,
      skipPing: true,
      clientRandomId: Date.now()
    })

    client.on('join', () => {
      console.log('✔ JOIN')
      lastActivity = Date.now()
    })

    client.on('spawn', () => {
      console.log('✔ SPAWN (in server)')
      isInServer = true
      lastActivity = Date.now()
      reconnectAttempts = 0
    })

    // attività reale
    client.on('text', () => lastActivity = Date.now())
    client.on('move_player', () => lastActivity = Date.now())

    // debug errori
    client.on('error', (err) => {
      console.log('❌ ERROR:', err?.message || err)
      scheduleReconnect('error')
    })

    client.on('disconnect', (packet) => {
      console.log('❌ DISCONNECT:', packet)
      scheduleReconnect('disconnect')
    })

  } catch (err) {
    console.log('❌ Crash createClient:', err.message)
    scheduleReconnect('crash')
  }
}

// 🔁 HEARTBEAT INTERNO (IMPORTANTE)
setInterval(() => {
  if (client && isInServer) {
    lastActivity = Date.now()
  }
}, 15000)

// 🔍 MONITOR STATO (FIXATO)
setInterval(() => {
  const inactiveFor = Date.now() - lastActivity

  console.log('🔍 STATUS:', {
    client: !!client,
    isInServer,
    inactiveSec: Math.floor(inactiveFor / 1000)
  })

  if (!client) {
    scheduleReconnect('no client')
    return
  }

  // solo se sei nel server e davvero morto da troppo tempo
  if (isInServer && inactiveFor > 900000) { // 15 min
    console.log('⚠️ Timeout reale inattività')
    scheduleReconnect('timeout')
  }

}, 20000)

process.on('SIGINT', () => {
  destroyClient()
  process.exit(0)
})

process.on('SIGTERM', () => {
  destroyClient()
  process.exit(0)
})

restoreAuth()
connect()
