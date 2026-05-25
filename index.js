const { createClient } = require('bedrock-protocol')
const http = require('http')
// Keep-alive web server for UptimeRobot
http.createServer((req, res) => {
  console.log(`[ping] ${new Date().toISOString()} - ${req.headers['user-agent'] || 'unknown'}`)
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
let reconnectDelay = 5000
let antiBotInterval = null
let position = { x: 0, y: 64, z: 0 }
function startBot() {
  if (client) {
    try { client.disconnect() } catch (_) {}
    client = null
  }
  if (antiBotInterval) {
    clearInterval(antiBotInterval)
    antiBotInterval = null
  }
  reconnecting = false
  console.log(`Avvio bot Bedrock... (retry delay: ${reconnectDelay / 1000}s)`)
  client = createClient({
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    clientGuid: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
    profilesFolder: '.auth-cache'
  })
  client.on('join', () => {
    console.log("Bot entrato nel server ✔")
    reconnectDelay = 5000
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
    console.log("Disconnesso:", packet?.reason || packet)
    scheduleReconnect()
  })
  client.on('error', (err) => {
    console.log("Errore:", err.message)
    scheduleReconnect()
  })
  client.on('close', () => {
    console.log("Connessione chiusa")
    scheduleReconnect()
  })
}
function scheduleReconnect() {
  if (reconnecting) return
  reconnecting = true
  if (antiBotInterval) { clearInterval(antiBotInterval); antiBotInterval = null }
  console.log(`Reconnect tra ${reconnectDelay / 1000} secondi...`)
  setTimeout(startBot, reconnectDelay)
  reconnectDelay = Math.min(reconnectDelay * 1.5, 60000)
}
process.on('uncaughtException', (err) => {
  console.log("Crash evitato:", err.message)
  scheduleReconnect()
})
process.on('unhandledRejection', (err) => {
  console.log("Promise rifiutata:", err?.message || err)
  scheduleReconnect()
})
startBot()
