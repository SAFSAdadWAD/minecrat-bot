const express = require('express')
const mineflayer = require('mineflayer')
const config = require('./config.json')

process.on('uncaughtException', (err) => {
  console.log('Errore ignorato:', err.message)
})

process.on('unhandledRejection', (reason) => {
  console.log('Rejection ignorata:', reason)
})

const app = express()
const PORT = process.env.PORT || 3000

let bot = null
let connecting = false
let reconnecting = false
let aiStarted = false

let lastMessage = null

// 🌐 Web server per Render / UptimeRobot
app.get('/', (req, res) => {
  res.send('Bot Minecraft online 🤖')
})

app.listen(PORT, () => {
  console.log(`Web server attivo sulla porta ${PORT}`)
})

/* =========================
   START BOT
========================= */
function startBot() {
  if (connecting || reconnecting || bot) return

  connecting = true
  console.log('Connessione al server...')

  bot = mineflayer.createBot({
    host: config.host,
    port: config.port || 25565,
    username: config.username,
    auth: config.cracked ? 'offline' : 'microsoft',
    version: config.version || false,
    keepAlive: true
  })

  bot.once('spawn', () => {
    console.log('Bot connesso!')
    connecting = false

    sendChat('Ciao! Sono online 🤖')

    if (!aiStarted) {
      aiStarted = true
      startAI()
    }
  })

  /* ================= CHAT ================= */
  bot.on('chat', (username, message) => {
    if (!bot) return
    if (username === bot.username) return

    const msg = message.toLowerCase()
    console.log(`[CHAT] ${username}: ${message}`)

    if (msg.includes('ciao')) sendChat(`Ciao ${username}! 👋`)
    if (msg.includes('come stai')) sendChat('Sto bene 😄')
    if (msg.includes('chi sei')) sendChat('Sono un bot Java 🤖')

    if (msg.includes('salta')) {
      sendChat('Boing 😄')
      jump()
    }
  })

  /* ================= EVENTS ================= */
  bot.on('kicked', (reason) => {
    console.log('KICK:', reason)
    safeReconnect()
  })

  bot.on('error', (err) => {
    console.log('ERROR:', err.message)
  })

  bot.on('end', () => {
    console.log('DISCONNESSO')
    safeReconnect()
  })
}

/* =========================
   SAFE RECONNECT (ANTI LOOP)
========================= */
function safeReconnect() {
  if (reconnecting) return
  reconnecting = true

  console.log('Riconnessione tra 45 secondi...')

  if (bot) {
    try { bot.quit() } catch {}
  }

  bot = null
  connecting = false
  aiStarted = false

  setTimeout(() => {
    reconnecting = false
    startBot()
  }, 45000)
}

/* =========================
   CHAT SAFE (NO SPAM)
========================= */
function sendChat(message) {
  if (!bot) return

  try {
    // blocca messaggi duplicati consecutivi
    if (message === lastMessage) return
    lastMessage = message

    bot.chat(message)
    console.log('[BOT]', message)
  } catch {}
}

/* =========================
   MOVIMENTO LEGGERO
========================= */
function moveRandom() {
  if (!bot || !bot.entity) return
  if (typeof bot.setControlState !== 'function') return

  const dirs = ['forward', 'back', 'left', 'right']
  const dir = dirs[Math.floor(Math.random() * dirs.length)]

  try {
    bot.setControlState(dir, true)

    setTimeout(() => {
      if (!bot) return
      try {
        bot.setControlState(dir, false)
      } catch {}
    }, 1000)
  } catch {}
}

/* =========================
   LOOK LEGGERO
========================= */
function lookAround() {
  if (!bot || !bot.entity) return

  try {
    const yaw = Math.random() * Math.PI * 2
    const pitch = (Math.random() - 0.5) * 0.6
    bot.look(yaw, pitch, true)
  } catch {}
}

/* =========================
   JUMP
========================= */
function jump() {
  if (!bot || !bot.entity) return
  if (typeof bot.setControlState !== 'function') return

  try {
    bot.setControlState('jump', true)

    setTimeout(() => {
      if (!bot) return
      try {
        bot.setControlState('jump', false)
      } catch {}
    }, 400)
  } catch {}
}

/* =========================
   RANDOM CHAT (SLOW)
========================= */
function randomChat() {
  if (!bot) return

  const messages = config.messages || [
    'Ciao!',
    'Sono un bot 🤖',
    'Sto esplorando...',
    'Procione mode 🦝'
  ]

  let msg = messages[Math.floor(Math.random() * messages.length)]

  if (msg === lastMessage) return
  lastMessage = msg

  sendChat(msg)
}

/* =========================
   AI LOOP (OTTIMIZZATO)
========================= */
function startAI() {
  console.log('AI avviata')

  setInterval(() => {
    moveRandom()
  }, config.moveInterval || 8000)

  setInterval(() => {
    lookAround()
  }, config.lookInterval || 7000)

  setInterval(() => {
    randomChat()
  }, config.chatInterval || 180000) // 3 MINUTI
}

/* =========================
   START
========================= */
startBot()
