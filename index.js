const mineflayer = require('mineflayer')
const express = require('express')
const config = require('./config.json')

// ----------------------
// 🌐 EXPRESS (Render + UptimeRobot)
// ----------------------
const app = express()
const PORT = process.env.PORT || 3000

app.get('/', (req, res) => {
  res.send('Bot Minecraft attivo 🤖')
})

app.listen(PORT, () => {
  console.log('Server web attivo sulla porta', PORT)
})

// ----------------------
// 🤖 BOT MINECRAFT
// ----------------------
let bot
let aiStarted = false
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

    if (!aiStarted) {
      aiStarted = true
      startAI()
    }
  })

  bot.on('chat', (username, message) => {
    if (username === bot.username) return

    const msg = message.toLowerCase()
    console.log(`[CHAT] ${username}: ${message}`)

    if (msg.includes('ciao')) {
      bot.chat(`Ciao ${username}! 👋`)
    }

    if (msg.includes('come stai')) {
      bot.chat('Sto bene 😄')
    }

    if (msg.includes('chi sei')) {
      bot.chat('Sono un bot AI 🤖')
    }

    if (msg.includes('salta')) {
      jump()
    }
  })

  bot.on('kicked', (reason) => {
    console.log('Kick:', reason)
    reconnect()
  })

  bot.on('error', (err) => {
    console.log('Errore:', err.message)
  })

  bot.on('end', () => {
    console.log('Connessione chiusa')
    reconnect()
  })
}

// ----------------------
// 🔁 RECONNECT
// ----------------------
function reconnect() {
  console.log('Riconnessione tra 10 secondi...')
  aiStarted = false

  setTimeout(() => {
    startBot()
  }, 10000)
}

// ----------------------
// 🧠 ANTI AFK AVANZATO
// ----------------------
function startAI() {
  console.log('AI avanzata attiva 🤖')

  setInterval(humanMovement, 1200)
  setInterval(humanLook, 800)
  setInterval(randomPause, 7000)
  setInterval(randomChat, config.chatInterval || 45000)
}

// 🚶 movimento umano
function humanMovement() {
  if (!bot || !bot.entity) return

  const now = Date.now()

  if (now - lastAction < 2000 && Math.random() < 0.6) return

  const actions = ['forward', 'left', 'right']
  const action = actions[Math.floor(Math.random() * actions.length)]

  bot.setControlState(action, true)

  const duration = 400 + Math.random() * 900

  setTimeout(() => {
    bot.setControlState(action, false)
  }, duration)

  lastAction = now
}

// 👀 camera naturale
function humanLook() {
  if (!bot || !bot.entity) return

  const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.4
  const pitch = bot.entity.pitch + (Math.random() - 0.5) * 0.2

  bot.look(yaw, pitch, true)
}

// 🧍 pause realistiche
function randomPause() {
  if (!bot) return

  if (Math.random() < 0.3) {
    bot.clearControlStates()

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

// 🦘 jump
function jump() {
  bot.setControlState('jump', true)

  setTimeout(() => {
    bot.setControlState('jump', false)
  }, 500)
}

// ----------------------
// START
// ----------------------
startBot()
