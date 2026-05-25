const { createClient } = require('bedrock-protocol')
const http = require('http')
const fs = require('fs')
const path = require('path')

const CACHE_DIR = './auth'
const AUTH_ENV = 'AUTH_DATA'
const PORT = process.env.PORT || 3000

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

    fs.mkdirSync(CACHE_DIR, { recursive: true })

    for (const [filename, content] of Object.entries(data)) {
      fs.writeFileSync(
        path.join(CACHE_DIR, filename),
        JSON.stringify(content, null, 2)
      )
    }

    console.log('Token ripristinato ✔')
  } catch (err) {
    console.error('Errore ripristino token:', err.message)
  }
}

// =======================
// WEB SERVER (Render keep alive)
// =======================
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Bot online ✔')
}).listen(PORT, () => {
  console.log(`Web server attivo sulla porta ${PORT}`)
})

// =======================
// CONNESSIONE BOT
// =======================
function startBot() {
  console.log('Tentativo di connessione...')

  const client = createClient({
    host: 'procione.aternos.me',
    port: 29309,

    skipPing: true,
    profilesFolder: CACHE_DIR,
    connectTimeout: 60000
  })

  client.on('join', () => {
    console.log('BOT ENTRATO ✔')
  })

  client.on('spawn', () => {
    console.log('SPAWN ✔')
  })

  client.on('disconnect', (packet) => {
    console.log('Disconnesso:')
    console.log(packet)
  })

  client.on('close', () => {
    console.log('Connessione chiusa')
  })

  client.on('error', (err) => {
    console.error('Errore:')
    console.error(err)
  })
}

// =======================
// START
// =======================
restoreAuth()
startBot()
