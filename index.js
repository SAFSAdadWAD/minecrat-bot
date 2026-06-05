const { createClient } = require('bedrock-protocol')
const http = require('http')
const fs = require('fs')
const path = require('path')

const CACHE_DIR = './auth'
const PORT = process.env.PORT || 10000

// =====================
// SERVER BEDROCK
// =====================
const SERVER_HOST = 'procione.aternos.me'
const SERVER_PORT = 29309

let client = null
let reconnecting = false
let connecting = false
let isInServer = false
let lastActivity = Date.now()
let reconnectTimer = null

// =====================
// WEB SERVER (RENDER)
// =====================
http
  .createServer((req, res) => {
    res.writeHead(200)
    res.end('BOT ONLINE')
  })
  .listen(PORT)

console.log(`Web server attivo su porta ${PORT}`)

// =====================
// RESTORE AUTH
// =====================
function restoreAuth() {
  try {
    if (!process.env.AUTH_DATA) {
      console.log('⚠️ AUTH_DATA non trovato')
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

    console.log('✅ Token ripristinato')
  } catch (err) {
    console.log('❌ Errore restore auth:', err.message)
  }
}

// =====================
// UPDATE ACTIVITY
// =====================
function updateActivity() {
  lastActivity = Date.now()
}

// =====================
// DESTROY CLIENT SICURO
// =====================
function destroyClient() {
  if (!client) return

  console.log('🧹 Distruggo client vecchio...')

  const oldClient = client

  client = null
  isInServer = false
  connecting = false

  try {
    oldClient.removeAllListeners()

    // SOLO disconnect
    if (typeof oldClient.disconnect === 'function') {
      oldClient.disconnect()
    }
  } catch (err) {
    console.log('⚠️ Errore destroy:', err?.message || err)
  }
}

// =====================
// RECONNECT
// =====================
function reconnect(reason = 'unknown') {
  if (reconnecting) {
    console.log('⏳ Reconnect già in corso')
    return
  }

  reconnecting = true

  console.log(`🔄 Reconnect (${reason})...`)

  destroyClient()

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
  }

  reconnectTimer = setTimeout(() => {
    reconnecting = false
    connect()
  }, 10000)
}

// =====================
// CONNECT
// =====================
function connect() {
  if (connecting) return

  connecting = true
  isInServer = false
  lastActivity = Date.now()

  console.log(
    `Tentativo di connessione a ${SERVER_HOST}:${SERVER_PORT}...`
  )

  try {
    client = createClient({
      host: SERVER_HOST,
      port: SERVER_PORT,

      profilesFolder: CACHE_DIR,

      // FIX ATERNOS
      skipPing: true,

      // timeout più alto
      connectTimeout: 30000,

      clientRandomId: Date.now()
    })

    // =================
    // JOIN
    // =================
    client.on('join', () => {
      console.log('✅ BOT ENTRATO')
      connecting = false
      updateActivity()
    })

    // =================
    // SPAWN
    // =================
    client.on('spawn', () => {
      console.log('✅ SPAWN')

      isInServer = true
      connecting = false

      updateActivity()
    })

    // =================
    // KEEP ACTIVITY
    // =================
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
      'respawn',
      'set_health'
    ]

    packets.forEach(packet => {
      client.on(packet, updateActivity)
    })

    // =================
    // DISCONNECT
    // =================
    client.on('disconnect', packet => {
      console.log('❌ DISCONNECT:', packet || 'unknown')

      connecting = false
      isInServer = false

      if (!reconnecting) {
        reconnect('disconnect')
      }
    })

    // =================
    // ERROR
    // =================
    client.on('error', err => {
      console.log(
        '❌ ERROR:',
        err?.message || err
      )

      connecting = false

      if (!reconnecting) {
        reconnect('error')
      }
    })
  } catch (err) {
    console.log(
      '❌ Errore createClient:',
      err?.message || err
    )

    connecting = false

    reconnect('crash')
  }
}

// =====================
// START
// =====================
restoreAuth()

setTimeout(() => {
  connect()
}, 3000)

// =====================
// CHECK STATUS
// =====================
setInterval(() => {
  console.log('🔍 Check stato bot...')

  const inactiveFor =
    Date.now() - lastActivity

  if (connecting) {
    console.log('⏳ Connessione in corso...')
    return
  }

  if (!client || !isInServer) {
    console.log(
      '⚠️ Bot fuori dal server'
    )

    reconnect('offline')
    return
  }

  // 15 minuti inattivo
  if (inactiveFor > 900000) {
    console.log(
      '⚠️ Nessuna attività da troppo tempo'
    )

    reconnect('timeout')
    return
  }

  console.log(
    '✅ Bot online nel server'
  )
}, 20000)

// =====================
// SHUTDOWN
// =====================
function shutdown(signal) {
  console.log(`${signal} ricevuto`)

  try {
    destroyClient()
  } catch {}

  process.exit(0)
}

process.on('SIGINT', () =>
  shutdown('SIGINT')
)

process.on('SIGTERM', () =>
  shutdown('SIGTERM')
)

// =====================
// DEBUG ERRORI
// =====================
process.on(
  'uncaughtException',
  err => {
    console.log(
      '❌ UNCAUGHT EXCEPTION'
    )
    console.error(err)
  }
)

process.on(
  'unhandledRejection',
  err => {
    console.log(
      '❌ UNHANDLED REJECTION'
    )
    console.error(err)
  }
)
