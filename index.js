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

function destroyClient() {
  if (!client) return

  console.log('🧹 Distruggo client vecchio...')

  try {
    client.removeAllListeners()
  } catch {}

  try {
    client.disconnect()
  } catch {}

  try {
    client.close()
  } catch {}

  try {
    client.socket?.close?.()
  } catch {}

  client = null
  isInServer = false
}

function reconnect(reason = 'unknown') {
  if (reconnecting) return

  reconnecting = true

  console.log(`🔄 Reconnect immediato (${reason})...`)

  destroyClient()

  reconnecting = false
  connect()
}

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

    client.on('join', () => {
      console.log('BOT ENTRATO ✔')
      lastActivity = Date.now()
    })

    client.on('spawn', () => {
      console.log('SPAWN ✔')
      isInServer = true
      lastActivity = Date.now()
    })

    // aggiorna attività rete
    client.on('text', () => {
      lastActivity = Date.now()
    })

    client.on('move_player', () => {
      lastActivity = Date.now()
    })

    client.on('update_attributes', () => {
      lastActivity = Date.now()
    })

    client.on('disconnect', (packet) => {
      console.log('DISCONNECT:', packet)
      reconnect('disconnect')
    })

    client.on('error', (err) => {
      console.log('ERROR:', err?.message || err)
      reconnect('error')
    })

  } catch (err) {
    console.log('Errore createClient:', err)
    reconnect('crash')
  }
}

restoreAuth()
connect()

// CHECK OGNI 20 SECONDI
setInterval(() => {
  console.log('🔍 Check stato bot...')

  const inactiveFor = Date.now() - lastActivity

  // bot fuori dal server
  if (!client || !isInServer) {
    console.log('⚠️ Bot fuori dal server')
    reconnect('offline')
    return
  }

  // 5 minuti senza attività
  if (inactiveFor > 300000) {
    console.log('⚠️ Connessione inattiva da troppo tempo')
    reconnect('timeout')
    return
  }

  console.log('✅ Bot online nel server')
}, 20000)

process.on('SIGINT', () => {
  destroyClient()
  process.exit(0)
})

process.on('SIGTERM', () => {
  destroyClient()
  process.exit(0)
})
