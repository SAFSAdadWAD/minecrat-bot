const { createClient } = require('bedrock-protocol')
const http = require('http')
const fs = require('fs')
const path = require('path')

const CACHE_DIR = './auth'
const PORT = process.env.PORT || 10000

let client = null
let isInServer = false
let reconnecting = false
let spawnConfirmed = false

let reconnectAttempts = 0
let lastGoodState = Date.now()

// ---------------- HTTP KEEP ALIVE ----------------
http.createServer((req, res) => {
  res.end('OK')
}).listen(PORT)

console.log("HTTP server attivo")

// ---------------- AUTH RESTORE ----------------
function restoreAuth() {
  try {
    if (!process.env.AUTH_DATA) return

    const data = JSON.parse(process.env.AUTH_DATA)
    fs.mkdirSync(CACHE_DIR, { recursive: true })

    for (const [k, v] of Object.entries(data)) {
      fs.writeFileSync(path.join(CACHE_DIR, k), JSON.stringify(v))
    }

    console.log("Auth ripristinata ✔")
  } catch (e) {
    console.log("Errore auth:", e.message)
  }
}

// ---------------- CLEAN CLIENT ----------------
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

// ---------------- CONNECT ----------------
async function connect() {
  if (reconnecting) return
  reconnecting = true

  destroyClient()

  const delay = Math.min(3000 * reconnectAttempts, 60000)

  console.log(`🔄 Reconnect tra ${delay}ms`)
  await new Promise(r => setTimeout(r, delay))

  try {
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
    console.log("CRASH:", e.message)
    reconnectAttempts++
    reconnecting = false
    connect()
  }

  reconnecting = false
}

// ---------------- HEARTBEAT (soft) ----------------
setInterval(() => {
  if (client && spawnConfirmed) {
    lastGoodState = Date.now()
  }
}, 15000)

// ---------------- WATCHDOG (FISSO, ANTI-ZOMBIE) ----------------
setInterval(() => {
  const now = Date.now()
  const idle = now - lastGoodState

  console.log("STATUS:", {
    client: !!client,
    inServer: isInServer,
    spawn: spawnConfirmed,
    idleMin: Math.floor(idle / 60000)
  })

  // CASO 1: client morto completamente
  if (!client) {
    console.log("❌ CLIENT NULL → reconnect")
    reconnectAttempts++
    reconnecting = false
    connect()
    return
  }

  // CASO 2: zombie connection (IL TUO PROBLEMA PRINCIPALE)
  if (spawnConfirmed && idle > 10 * 60 * 1000) {
    console.log("💀 ZOMBIE SOCKET → force reconnect")
    reconnectAttempts++
    reconnecting = false
    destroyClient()
    connect()
    return
  }

}, 30000)

// ---------------- START ----------------
restoreAuth()
connect()
