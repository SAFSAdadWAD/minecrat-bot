const mineflayer = require('mineflayer')
const express = require('express')
const config = require('./config.json')

// --------------------
// 🌐 EXPRESS (Render + UptimeRobot)
// --------------------
const app = express()
const PORT = process.env.PORT || 3000

app.get('/', (req, res) => {
  res.send('Bot Minecraft attivo 🤖')
})

app.listen(PORT, () => {
  console.log('Web server attivo su porta', PORT)
})

// --------------------
// 🤖 BOT
// --------------------
let bot = null
let aiStarted = false
let reconnecting = false
let lastAction = Date.now()

function startBot() {
  console.log('Connessione al server...')

  bot = mineflayer.createBot({
    host: config.host,
    port: Number(config.port),
    username: config.username,
    auth: 'offline'
  })

  bot.once('spawn', () => {
    console.log('Bot entrato nel server!')
    bot.chat('Ciao! Sono online 🤖')

    aiStarted = true
    startAI()
  })

  bot.on('chat', (username, message) => {
    if (!bot || username === bot.username) return

    const msg = message.toLowerCase()

    console.log(`[CHAT] ${username}: ${message}`)

    if (msg.includes('ciao')) {
      bot.chat(`Ciao ${username}! 👋`)
    }

    if (msg.includes('chi sei')) {
      bot.chat('Sono un bot AI 🤖')
    }

    if (msg.includes('come stai')) {
      bot.chat('Sto bene 😄')
    }
  })

  bot.on('kicked', (reason) => {
    console.log('Kick:', reason)
    safeReconnect()
  })

  bot.on('error', (err) => {
    console.log('Errore:', err.message)
    safeReconnect()
  })

  bot.on('end', () => {
    console.log('Connessione chiusa')
    safeReconnect()
  })
}

// --------------------
// 🔁 RECONNECT SAFE
// --------------------
function safeReconnect() {
  if (reconnecting) return
  reconnecting = true

  console.log('Riconnessione tra 15 secondi...')

  aiStarted = false

  if (bot) {
    try {
      bot.end()
    } catch {}
    bot = null
  }

  setTimeout(() => {
    reconnecting = false
    startBot()
  }, 15000)
}

// --------------------
// 🧠 ANTI-AFK AVANZATO
// --------------------
function startAI() {
  console.log('AI attiva 🤖')

  setInterval(() => {
    if (!bot || !bot.entity) return
    humanMove()
  }, 1200)

  setInterval(() => {
    if (!bot || !bot.entity) return
    humanLook()
  }, 900)

  setInterval(() => {
    if (!bot || !bot.entity) return
    randomPause()
  }, 7000)

  setInterval(() => {
    if (!bot || !bot.entity) return
    randomChat()
  }, config.chatInterval || 45000)

  setInterval(() => {
    keepAliveFix()
  }, 15000)
}

// 🚶 movimento umano
function humanMove() {
  if (!bot) return

  const now = Date.now()
  if (now - lastAction < 2000 && Math.random() < 0.6) return

  const actions = ['forward', 'left', 'right']
  const action = actions[Math.floor(Math.random() * actions.length)]

  bot.setControlState(action, true)

  setTimeout(() => {
    if (bot) bot.setControlState(action, false)
  }, 500 + Math.random() * 900)

  lastAction = now
}

// 👀 look naturale
function humanLook() {
  if (!bot || !bot.entity) return

  const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.4
  const pitch = bot.entity.pitch + (Math.random() - 0.5) * 0.2

  bot.look(yaw, pitch, true)
}

// 🧍 pause realistiche
function randomPause() {
  if (!bot) return

  if (Math.random() < 0.25) {
    safeClearControls()

    setTimeout(() => {
      lastAction = Date.now()
    }, 1500 + Math.random() * 3000)
  }
}

// 💬 chat random
function randomChat() {
  if (!bot) return

  const messages = config.messages || [
    'Ciao 👋',
    'Sto esplorando...',
    'Bel server 😄',
    'Qualcuno online?'
  ]

  const msg = messages[Math.floor(Math.random() * messages.length)]
  bot.chat(msg)
}

// 🧹 SAFE CONTROL CLEAR
function safeClearControls() {
  if (bot && bot.clearControlStates) {
    try {
      bot.clearControlStates()
    } catch {}
  }
}

// 💓 keep alive fix timeout
function keepAliveFix() {
  if (!bot) return

  try {
    bot._client?.write('keep_alive', {
      keepAliveId: Date.now()
    })
  } catch {}
}

// --------------------
// START
// --------------------
startBot()
