const { createClient } = require('bedrock-protocol')
const http = require('http')
const fs = require('fs')
const path = require('path')

const CACHE_DIR = './auth'
const PORT = process.env.PORT || 3000

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
  res.end('OK')
}).listen(PORT)

console.log('Web server attivo')

function start() {
  console.log('Tentativo di connessione...')

  const client = createClient({
    host: 'procione.aternos.me',
    port: 29309,

    skipPing: true,
    profilesFolder: CACHE_DIR,

    // 🔥 FIX IMPORTANTE
    deviceId: undefined,
    clientRandomId: undefined
  })

  client.on('join', () => {
    console.log('BOT ENTRATO ✔')
  })

  client.on('spawn', () => {
    console.log('SPAWN ✔')
  })

  client.on('disconnect', (p) => {
    console.log('DISCONNECT:', p)
  })

  client.on('error', console.error)
}

restoreAuth()
start()
