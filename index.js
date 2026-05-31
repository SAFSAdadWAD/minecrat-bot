const { createClient } = require('bedrock-protocol')
const http = require('http')
const fs = require('fs')
const path = require('path')

const CACHE_DIR = './auth'
const PORT = process.env.PORT || 10000

let client = null
let isInServer = false
let spawnConfirmed = false
let reconnecting = false

let reconnectAttempts = 0
let lastGoodState = Date.now()

// ---------------- HTTP (Render keep alive) ----------------
http.createServer((req, res) => {
  res.end('OK')
}).listen(PORT)

console.log("HTTP server attivo")

// ---------------- AUTH ----------------
function restoreAuth() {
  try {
    if (!process.env.AUTH_DATA) return

    const data = JSON.parse(process.env.AUTH_DATA)
    fs.mkdirSync(CACHE_DIR, { recursive: true })

    for (const [k, v] of Object.entries(data)) {
      fs.writeFileSync(path.join(CACHE_DIR, k), JSON.stringify(v))
    }

    console.log("Auth OK")
  } catch (e) {
    console.log("Auth error:", e.message)
  }
}

// ---------------- CLEAN ----------------
function destroyClient() {
  if (!client) return

  try { client.removeAllListeners() } catch {}
  try { client.disconnect() } catch {}
  try { client.close() } catch {}
  try { client.socket?.close?.() } catch {}

  client = null
  isInServer = false
  spawnConfirmed = false
}

// ---------------- SMART BACKOFF ----------------
function getDelay() {
  return Math.min(
    10000 + reconnectAttempts * 10000, // cresce lentamente
    120000 // max 2 minuti
  )
}

// ---------------- CONNECT ----------------
async function connect() {
  if (reconnecting) return
  reconnecting = true

  destroyClient()

  const delay = getDelay()
  console.log(`🔄 Reconnect tra ${delay}ms`)

  await new Promise(r => setTimeout(r, delay))

  try {
    console.log("➡️ Tentativo connessione server...")

    client = createClient({
      host: 'procione.aternos.me',
      port: 29309,
      profilesFolder: CACHE_DIR,
      skipPing: true,
      clientRandomId: Date.now()
    })

    client.on('join', () => {
      console.log("JOIN")
    })

    client.on('spawn', () => {
      console.log("SPAWN ✔")
      isInServer = true
      spawnConfirmed = true
      reconnectAttempts = 0
      lastGoodState = Date.now()
    })

    client.on('text', () => lastGoodState = Date.now())
    client.on('move_player', () => lastGoodState = Date.now())

    client.on('disconnect', () => {
      console.log("DISCONNECT")
      reconnectAttempts++
      reconnecting = false
      connect()
    })

    client.on('error', (e) => {
      console.log("ERROR:", e?.message)
      reconnectAttempts++
      reconnecting = false
      connect()
    })

  } catch (e) {
    console.log("CONNECT FAIL:", e.message)
    reconnectAttempts++
    reconnecting = false
    connect()
  }

  reconnecting = false
}

// ---------------- WATCHDOG (SOFT) ----------------
setInterval(() => {
  const idle = Date.now() - lastGoodState

  console.log("STATUS:", {
    client: !!client,
    inServer: isInServer,
    spawn: spawnConfirmed,
    idleMin: Math.floor(idle / 60000)
  })

  // SOLO zombie connection (non spammare subito)
  if (client && spawnConfirmed && idle > 15 * 60 * 1000) {
    console.log("💀 ZOMBIE SOCKET → reconnect")
    reconnectAttempts++
    reconnecting = false
    destroyClient()
    connect()
  }

}, 30000)

// ---------------- START ----------------
restoreAuth()
connect()
