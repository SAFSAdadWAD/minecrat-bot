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

// Host e porta FISSI — non cambiano mai, anche dopo trasferimenti BungeeCord
const MC_HOST = config.host
const MC_PORT = config.port || 25565

let bot = null
let connecting = false
let reconnecting = false
let aiStarted = false
let inQueue = false

let lastMessage = null

// 🌐 Web server per Render / UptimeRobot
app.get('/', (req, res) => {
  const status = bot ? (inQueue ? 'In coda Aternos' : 'Connesso') : 'Disconnesso'
  res.send(`Bot Minecraft online 🤖 — Stato: ${status}`)
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
  inQueue = false
  console.log(`Connessione a ${MC_HOST}:${MC_PORT}...`)

  bot = mineflayer.createBot({
    host: MC_HOST,
    port: MC_PORT,
    username: config.username,
    auth: config.cracked ? 'offline' : 'microsoft',
    version: config.version || '1.21.1',
    keepAlive: true,
    checkTimeoutInterval: 60000,
    skipSRV: true
  })

  bot.once('spawn', () => {
    console.log('Bot connesso e spawnato!')
    connecting = false
    inQueue = false

    sendChat('Ciao! Sono online 🤖')

    if (!aiStarted) {
      aiStarted = true
      startAI()
    }
  })

  /* ================= ATERNOS QUEUE ================= */
  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString()
    console.log('[MSG]', text)

    if (
      text.includes('queue') ||
      text.includes('coda') ||
      text.includes('position') ||
      text.includes('posizione') ||
      text.includes('wait') ||
      text.includes('aspetta') ||
      text.includes('starting') ||
      text.includes('avvio')
    ) {
      if (!inQueue) {
        inQueue = true
        console.log('Bot in coda Aternos, aspetto...')
      }
    }

    if (
      text.includes('Benvenuto') ||
      text.includes('Welcome') ||
      text.includes('joined the game')
    ) {
      inQueue = false
    }
  })

  /* ================= CHAT ================= */
  bot.on('chat', (username, message) => {
    if (!bot) return
    if (username === bot.username) return
    if (inQueue) return

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
    const reasonStr = typeof reason === 'string' ? reason : JSON.stringify(reason)
    console.log('KICK:', reasonStr)

    if (
      reasonStr.includes('queue') ||
      reasonStr.includes('coda') ||
      reasonStr.includes('starting') ||
      reasonStr.includes('avvio')
    ) {
      console.log('Kick dalla coda Aternos, riprovo tra 30 secondi...')
      safeReconnect(30000)
    } else {
      safeReconnect()
    }
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
function safeReconnect(delay) {
  if (reconnecting) return
  reconnecting = true

  const waitTime = delay || 45000
  console.log(`Riconnessione tra ${waitTime / 1000} secondi...`)

  if (bot) {
    try { bot.quit() } catch {}
  }

  bot = null
  connecting = false
  aiStarted = false
  inQueue = false

  setTimeout(() => {
    reconnecting = false
    startBot()
  }, waitTime)
}

/* =========================
   CHAT SAFE (NO SPAM)
========================= */
function sendChat(message) {
  if (!bot || inQueue) return

  try {
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
  if (!bot || !bot.entity || inQueue) return
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
  if (!bot || !bot.entity || inQueue) return

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
  if (!bot || !bot.entity || inQueue) return
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
  if (!bot || inQueue) return

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
  }, config.chatInterval || 180000)
}

/* =========================
   START
========================= */
startBot()
