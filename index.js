\const { createClient } = require('bedrock-protocol')
const http = require('http')
const fs = require('fs')
const path = require('path')

const CACHE_DIR = './auth'
const PORT = process.env.PORT || 10000

let client = null
let reconnecting = false
let isInServer = false
let lastActivity = Date.now()
let reconnectTimeout = null

// =========================
// RESTORE AUTH
// =========================
function restoreAuth() {
  try {
    if (!process.env.AUTH_DATA) {
      console.log('Nessun token salvato')
      return
    }

    const data = JSON.parse(process.env.AUTH_DATA)

    fs.mkdirSync(CACHE_DIR, { recursive: true })

    for (const [fileName, content] of Object.entries(data)) {
      fs.writeFileSync(
        path.join(CACHE_DIR, fileName),
        JSON.stringify(content)
      )
    }

    console.log('Token ripristinato ✔')
  } catch (err) {
    console.log('Errore auth:', err.message)
  }
}

// =========================
// WEB SERVER (UPTIME)
// =========================
http.createServer((req, res) => {
  res.writeHead(200)
  res.end('BOT ONLINE')
}).listen(PORT)

console.log('Web server attivo su porta', PORT)

// =========================
// DESTROY CLIENT SICURO
// =========================
function destroyClient() {
  if (!client) return

  console.log('🧹 Distruggo client vecchio...')

  const oldClient = client
  client = null
  isInServer = false

  try {
    oldClient.removeAllListeners()

    // SOLO disconnect
    if (typeof oldClient.disconnect === 'function') {
      oldClient.disconnect()
    }
  } catch (err) {
    console.log('Errore destroy:', err?.message || err)
  }
}

// =========================
// RECONNECT SICURO
// =========================
function reconnect(reason = 'unknown') {
  if (reconnecting) {
    console.log('⏳ Reconnect già in corso')
    return
  }

  reconnecting = true

  console.log(`🔄 Reconnect (${reason})...`)

  destroyClient()

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
  }

  reconnectTimeout = setTimeout(() => {
    reconnecting = false
    connect()
  }, 5000)
}

// =========================
// CONNECT
// =========================
function connect() {
  console.log('Tentativo di connessione...')

  destroyClient()

  isInServer = false
  lastActivity = Date.now()

  try {
    client = createClient({
      host: 'procione.aternos.me',
      port: 29309,

      profilesFolder: CACHE_DIR,
      skipPing: true,

      deviceId: undefined,
      clientRandomId: Date.now()
    })

    const updateActivity = () => {
      lastActivity = Date.now()
    }

    // =====================
    // EVENTI PRINCIPALI
    // =====================
    client.on('join', () => {
      console.log('BOT ENTRATO ✔')
      updateActivity()
    })

    client.on('spawn', () => {
      console.log('SPAWN ✔')
      isInServer = true
      updateActivity()
    })

    // =====================
    // ATTIVITÀ RETE
    // =====================
    const packets = [
      'text',
      'move_player',
      'update_attributes',
      'tick_sync',
      'network_settings',
      'inventory_content',
      'level_chunk',
      'set_time',
      'play_status',
      'player_list',
      'respawn'
    ]

    packets.forEach(packet => {
      client.on(packet, updateActivity)
    })

    // =====================
    // DISCONNECT
    // =====================
    client.on('disconnect', packet => {
      console.log('DISCONNECT:', packet || 'unknown')

      if (!reconnecting) {
        reconnect('disconnect')
      }
    })

    // =====================
    // ERROR
    // =====================
    client.on('error', err => {
      console.log('ERROR:', err?.message || err)

      if (!reconnecting) {
        reconnect('error')
      }
    })

  } catch (err) {
    console.log('Errore createClient:', err)

    if (!reconnecting) {
      reconnect('crash')
    }
  }
}

// =========================
// START
// =========================
restoreAuth()
connect()

// =========================
// CHECK OGNI 20 SECONDI
// =========================
setInterval(() => {
  console.log('🔍 Check stato bot...')

  const inactiveFor = Date.now() - lastActivity

  if (!client || !isInServer) {
    console.log('⚠️ Bot fuori dal server')
    reconnect('offline')
    return
  }

  // 10 minuti inattivo
  if (inactiveFor > 600000) {
    console.log('⚠️ Connessione inattiva da troppo tempo')
    reconnect('timeout')
    return
  }

  console.log('✅ Bot online nel server')
}, 20000)

// =========================
// SHUTDOWN SICURO
// =========================
function gracefulShutdown(signal) {
  console.log(`\n${signal} ricevuto, chiusura...`)

  try {
    destroyClient()
  } catch {}

  process.exit(0)
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

// Evita crash silenziosi
process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION:', err)
})

process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION:', err)
})
