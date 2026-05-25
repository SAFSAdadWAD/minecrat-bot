const { createClient } = require('bedrock-protocol')
const http = require('http')
const fs = require('fs')
const path = require('path')

const CACHE_DIR = './auth'
const AUTH_ENV = 'AUTH_DATA'
const PORT = process.env.PORT || 3000

const CONFIG = {
  host: 'procione.aternos.me',
  port: 29309
}

let client = null
let reconnecting = false
let antiAfkInterval = null
let retryDelay = 30000
let position = { x: 0, y: 64, z: 0 }

// =======================
// RIPRISTINO TOKEN
// =======================
function restoreAuth() {
  try {
    if (!process.env[AUTH_ENV]) {
      console.log('AUTH_DATA non trovata')
      return
    }

    const data = JSON.parse(process.env[AUTH_ENV])

    fs.mkdirSync(CACHE_DIR, {
      recursive: true
    })

    for (const [filename, content] of Object.entries(data)) {
      fs.writeFileSync(
        path.join(CACHE_DIR, filename),
        JSON.stringify(content, null, 2)
      )
    }

    console.log('Token ripristinato ✔')
  } catch (err) {
    console.error(
      'Errore ripristino token:',
      err.message
    )
  }
}

// =======================
// SERVER HTTP (Render)
// =======================
http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  })

  res.end('Bot online ✔')
}).listen(PORT, () => {
  console.log(`Web server attivo sulla porta ${PORT}`)
})

// =======================
// PULIZIA CLIENT
// =======================
function destroyClient() {
  if (antiAfkInterval) {
    clearInterval(antiAfkInterval)
    antiAfkInterval = null
  }

  if (client) {
    try {
      client.removeAllListeners()
    } catch (_) {}

    try {
      client.disconnect()
    } catch (_) {}

    client = null
  }
}

// =======================
// CONNESSIONE BOT
// =======================
function startBot() {
  destroyClient()
  reconnecting = false

  console.log(
    `Tentativo di connessione a ${CONFIG.host}:${CONFIG.port}...`
  )

  try {
    client = createClient({
      host: CONFIG.host,
      port: CONFIG.port,

      // evita RakTimeout su Render
      skipPing: true,

      // usa token salvato
      profilesFolder: CACHE_DIR,

      // timeout più lungo
      connectTimeout: 60000
    })
  } catch (err) {
    console.error(
      'Errore creazione client:',
      err
    )

    return scheduleReconnect()
  }

  // =======================
  // JOIN
  // =======================
  client.on('join', () => {
    console.log('BOT ENTRATO ✔')
    retryDelay = 30000
  })

  // =======================
  // SPAWN
  // =======================
  client.on('spawn', (packet) => {
    console.log('SPAWN ✔')

    if (packet?.position) {
      position = packet.position
    }

    // Anti AFK leggero
    let yaw = Math.random() * 360

    antiAfkInterval = setInterval(() => {
      if (!client?.queue) return

      try {
        yaw =
          (yaw + (Math.random() * 10 - 5) + 360) %
          360

        const pitch =
          Math.random() * 10 - 5

        client.queue('move_player', {
          position,
          pitch,
          yaw,
          head_yaw: yaw,
          mode: 0,
          on_ground: true,
          ride_runtime_id: 0n,
          teleportation_cause: 0,
          entity_type: 0,
          tick: BigInt(Date.now())
        })
      } catch (_) {}
    }, 15000)
  })

  // =======================
  // DISCONNECT
  // =======================
  client.on('disconnect', (packet) => {
    console.log('Disconnesso:')
    console.log(packet)

    scheduleReconnect()
  })

  // =======================
  // CLOSE
  // =======================
  client.on('close', () => {
    console.log('Connessione chiusa')
    scheduleReconnect()
  })

  // =======================
  // ERROR
  // =======================
  client.on('error', (err) => {
    console.error('Errore client:')
    console.error(err)

    scheduleReconnect()
  })
}

// =======================
// RECONNECT
// =======================
function scheduleReconnect() {
  if (reconnecting) return

  reconnecting = true
  destroyClient()

  console.log(
    `Reconnect tra ${retryDelay / 1000}s...`
  )

  setTimeout(() => {
    startBot()
  }, retryDelay)

  retryDelay = Math.min(
    retryDelay + 15000,
    120000
  )
}

// =======================
// ANTI CRASH
// =======================
process.on('uncaughtException', (err) => {
  console.error(
    'Crash evitato:',
    err
  )

  if (!reconnecting) {
    scheduleReconnect()
  }
})

process.on('unhandledRejection', (err) => {
  console.error(
    'Promise rifiutata:',
    err
  )

  if (!reconnecting) {
    scheduleReconnect()
  }
})

// =======================
// AVVIO
// =======================
restoreAuth()
startBot()
