const { createClient } = require('bedrock-protocol')
const http = require('http')
const fs = require('fs')
const path = require('path')

const HOST = 'procione.aternos.me'
const PORT = 29309

const CACHE_DIR = './auth'
const WEB_PORT = process.env.PORT || 10000

let client = null
let isInServer = false
let connecting = false

// =====================
// WEB SERVER (RENDER)
// =====================
http.createServer((req, res) => {
  res.writeHead(200)
  res.end('BOT ONLINE')
}).listen(WEB_PORT)

console.log('Web server attivo su porta', WEB_PORT)

// =====================
// AUTH
// =====================
function restoreAuth() {
  try {
    if (!process.env.AUTH_DATA) return

    const data = JSON.parse(process.env.AUTH_DATA)

    fs.mkdirSync(CACHE_DIR, { recursive: true })

    for (const [k, v] of Object.entries(data)) {
      fs.writeFileSync(path.join(CACHE_DIR, k), JSON.stringify(v))
    }

    console.log('Token ripristinato ✔')
  } catch (e) {
    console.log('Errore auth:', e.message)
  }
}

// =====================
// CONNECT
// =====================
function connect() {
  if (connecting) return
  connecting = true

  console.log('Tentativo connessione...')

  try {
    client = createClient({
      host: HOST,
      port: PORT,
      profilesFolder: CACHE_DIR,
      skipPing: true,
      connectTimeout: 30000,
      clientRandomId: Date.now()
    })

    client.on('join', () => {
      console.log('BOT ENTRATO ✔')
    })

    client.on('spawn', () => {
      console.log('SPAWN ✔')
      isInServer = true
      connecting = false
    })

    client.on('disconnect', () => {
      console.log('DISCONNECT')
      isInServer = false
      connecting = false
    })

    client.on('error', (err) => {
      console.log('ERROR:', err?.message || err)
      isInServer = false
      connecting = false
    })

  } catch (err) {
    console.log('CONNECT ERROR:', err.message)
    isInServer = false
    connecting = false
  }
}

// =====================
// DISCONNECT SAFE
// =====================
function destroyClient() {
  if (!client) return

  try {
    client.removeAllListeners()
    client.disconnect()
  } catch {}

  client = null
  isInServer = false
  connecting = false
}

// =====================
// CHECK OGNI 5 SECONDI
// =====================
setInterval(() => {
  console.log('🔍 Check bot...')

  if (!client || !isInServer) {
    console.log('⚠️ Bot fuori → riconnessione')
    destroyClient()
    connect()
    return
  }

  console.log('✅ Bot dentro il server')
}, 5000)

// =====================
// START
// =====================
restoreAuth()
connect()
