const express = require('express')
const mineflayer = require('mineflayer')
const config = require('./config.json')

const app = express()
const PORT = process.env.PORT || 3000

let bot = null
let connecting = false
let aiStarted = false

// 🌐 Web server per Render / UptimeRobot
app.get('/', (req, res) => {
  res.send('Bot Minecraft online!')
})

app.listen(PORT, () => {
  console.log(`Web server attivo sulla porta ${PORT}`)
})

/* =======================
   START BOT
======================= */
function startBot() {
  if (connecting || bot) {
    console.log('Connessione già attiva o in corso')
    return
  }

  connecting = true
  console.log('Tentativo di connessione...')

  bot = mineflayer.createBot({
    host: config.host,
    port: config.port || 25565,
    username: config.username,
    auth: config.cracked ? 'offline' : 'microsoft',
    version: config.version || false
  })

  // 🎮 Spawn
  bot.once('spawn', () => {
    console.log('Bot connesso!')
    connecting = false

    sendChat('Ciao! Sono online 🤖')

    if (!aiStarted) {
      aiStarted = true
      startAI()
    }
  })

  // 💬 Chat
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

  // ❌ Kick
  bot.on('kicked', (reason) => {
    console.log('KICK:', reason)
    safeReconnect()
  })

  // ❌ Error
  bot.on('error', (err) => {
    console.log('Errore:', err.message)
  })

  // ❌ Disconnect
  bot.on('end', () => {
    console.log('Disconnesso')
    safeReconnect()
  })
}

/* =======================
   SAFE RECONNECT
======================= */
function safeReconnect() {
  if (bot) {
    try {
      bot.quit()
    } catch {}
  }

  bot = null
  connecting = false

  console.log('Riconnessione tra 60 secondi...')

  setTimeout(() => {
    startBot()
  }, 60000) // IMPORTANTISSIMO: evita Aternos throttle
}

/* =======================
   CHAT
======================= */
function sendChat(message) {
  if (!bot) return

  try {
    bot.chat(message)
    console.log('[BOT]', message)
  } catch {}
}

/* =======================
   MOVIMENTO
======================= */
function moveRandom() {
  if (!bot || !bot.entity) return
  if (typeof bot.setControlState !== 'function') return

  const dirs = ['forward', 'back', 'left', 'right']
  const dir = dirs[Math.floor(Math.random() * dirs.length)]

  try {
    bot.setControlState(dir, true)

    setTimeout(() => {
      if (!bot || !bot.entity) return
      try {
        bot.setControlState(dir, false)
      } catch {}
    }, 1200)
  } catch {}
}

/* =======================
   LOOK
======================= */
function lookAround() {
  if (!bot || !bot.entity) return

  try {
    const yaw = Math.random() * Math.PI * 2
    const pitch = (Math.random() - 0.5) * 0.8
    bot.look(yaw, pitch, true)
  } catch {}
}

/* =======================
   JUMP
======================= */
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
    }, 500)
  } catch {}
}

/* =======================
   RANDOM CHAT
======================= */
function randomChat() {
  if (!bot) return

  const messages = config.messages || [
    'Ciao!',
    'Sono un bot 🤖',
    'Sto girando il server!',
    'Procione mode 🦝'
  ]

  const msg = messages[Math.floor(Math.random() * messages.length)]
  sendChat(msg)
}

/* =======================
   AI LOOP
======================= */
function startAI() {
  console.log('AI avviata')

  setInterval(() => {
    moveRandom()
  }, config.moveInterval || 7000)

  setInterval(() => {
    lookAround()
  }, config.lookInterval || 5000)

  setInterval(() => {
    randomChat()
  }, config.chatInterval || 90000)
}

/* =======================
   START
======================= */
startBot()
