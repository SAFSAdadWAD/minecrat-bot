const { createClient, ping } = require('bedrock-protocol')
const http = require('http')
const fs = require('fs')
const path = require('path')

const CACHE_DIR = '.auth-cache'
const AUTH_ENV = 'AUTH_DATA'

if (process.env[AUTH_ENV]) {
  try {
    const data = JSON.parse(process.env[AUTH_ENV])
    fs.mkdirSync(CACHE_DIR, { recursive: true })
    for (const [filename, content] of Object.entries(data)) {
      fs.writeFileSync(path.join(CACHE_DIR, filename), JSON.stringify(content))
    }
    console.log("Token ripristinato dalla variabile d'ambiente ✔")
  } catch (e) {
    console.log("Errore nel ripristino del token:", e.message)
  }
}

http.createServer((req, res) => {
  if (req.url === '/token-backup') {
    try {
      const files = fs.readdirSync(CACHE_DIR)
      const data = {}
      for (const f of files) {
        data[f] = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf8'))
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(data))
    } catch (e) {
      res.writeHead(404)
      res.end('Token non ancora disponibile')
    }
    return
  }
  res.writeHead(200)
  res.end('Bot online')
}).listen(3000, () => {
  console.log("Web server attivo sulla porta 3000")
})

const CONFIG = {
  host: "procione.aternos.me",
  port: 29309,
  username: "PROCIONE"
}

let client = null
let reconnecting = false
let antiBotInterval = null
let position = { x: 0, y: 64, z: 0 }

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitForServer() {
  let consecutiveOk = 0
  while (true) {
    try {
      await ping({ host: CONFIG.host, port: CONFIG.port })
      consecutiveOk++
      console.log(`Server risponde (${consecutiveOk}/3)...`)
      if (consecutiveOk >= 3) {
        console.log("Server stabile, attendo 5s prima di connettermi...")
        await sleep(5000)
        return
      }
      await sleep(5000)
    } catch (e) {
      if (consecutiveOk > 0) console.log("Server non stabile, riprovo...")
      consecutiveOk = 0
      await sleep(10000)
    }
  }
}

async function startBot() {
  if (client) {
    try { client.disconnect() } catch (_) {}
    client = null
  }
  if (antiBotInterval) {
    clearInterval(antiBotInterval)
    antiBotInterval = null
  }

  reconnecting = false
  console.log("Attendo che il server Aternos sia pronto...")

  await waitForServer()

  console.log("Avvio connessione bot Bedrock...")

  client = createClient({
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    clientGuid: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
    profilesFolder: CACHE_DIR,
    useNativeRaknet: false
  })

  client.on('join', () => {
    console.log("Bot entrato nel server ✔")

    try {
      const files = fs.readdirSync(CACHE_DIR)
      const data = {}
      for (const f of files) {
        data[f] = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf8'))
      }
      console.log("=== AUTH_DATA ===")
      console.log(JSON.stringify(data))
      console.log("=================")
    } catch (_) {}

    let yaw = Math.random() * 360
    antiBotInterval = setInterval(() => {
      if (!client || !client.queue) return
      try {
        yaw = (yaw + (Math.random() * 10 - 5) + 360) % 360
        const pitch = Math.random() * 20 - 10
        client.queue('move_player', {
          position, pitch, yaw, head_yaw: yaw,
          mode: 0, on_ground: true,
          ride_runtime_id: 0n, teleportation_cause: 0,
          entity_type: 0, tick: BigInt(Date.now())
        })
      } catch (_) {}
    }, 4000)
  })

  client.on('spawn', (packet) => {
    if (packet?.position) position = packet.position
  })

  client.on('disconnect', (packet) => {
    const reason = packet?.reason || String(packet)
    console.log("Disconnesso:", reason)
    scheduleReconnect(15000)
  })

  client.on('error', (err) => {
    console.log("Errore:", err.message)
    scheduleReconnect(15000)
  })

  client.on('close', () => {
    console.log("Connessione chiusa")
    scheduleReconnect(15000)
  })
}

function scheduleReconnect(delay = 15000) {
  if (reconnecting) return
  reconnecting = true
  if (antiBotInterval) { clearInterval(antiBotInterval); antiBotInterval = null }
  console.log(`Reconnect tra ${delay / 1000} secondi...`)
  setTimeout(startBot, delay)
}

process.on('uncaughtException', (err) => {
  console.log("Crash evitato:", err.message)
  scheduleReconnect(15000)
})

process.on('unhandledRejection', (err) => {
  console.log("Promise rifiutata:", err?.message || err)
  scheduleReconnect(15000)
})

startBot()
