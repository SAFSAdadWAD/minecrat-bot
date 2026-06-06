const express = require('express')
const mineflayer = require('mineflayer')
const config = require('./config.json')

const app = express()
const PORT = process.env.PORT || 3000

let bot = null
let aiStarted = false

// SERVER WEB PER RENDER / UPTIMEROBOT
app.get('/', (req, res) => {
  res.send('Bot Minecraft online!')
})

app.listen(PORT, () => {
  console.log(`Web server attivo sulla porta ${PORT}`)
})

// AVVIO BOT
function startBot() {
  console.log('Tentativo di connessione...')

  bot = mineflayer.createBot({
    host: config.host,
    port: config.port || 25565,
    username: config.username,
    auth: config.cracked ? 'offline' : 'microsoft'
  })

  bot.once('spawn', () => {
    console.log('Bot connesso!')

    sendChat('Ciao! Sono online 🤖')

    if (!aiStarted) {
      aiStarted = true
      startAI()
    }
  })

  // CHAT
  bot.on('chat', (username, message) => {
    if (username === bot.username) return

    const msg = message.toLowerCase()

    console.log(`[CHAT] ${username}: ${message}`)

    if (msg.includes('ciao')) {
      sendChat(`Ciao ${username}! 👋`)
    }

    if (msg.includes('come stai')) {
      sendChat('Sto bene 😄')
    }

    if (msg.includes('chi sei')) {
      sendChat('Sono un bot AI Java 😎')
    }

    if (msg.includes('salta')) {
      sendChat('Boing 😄')
      jump()
    }
  })

  bot.on('kicked', (reason) => {
    console.log('Espulso:', reason)
    reconnect()
  })

  bot.on('error', (err) => {
    console.log('Errore:', err.message)
  })

  bot.on('end', () => {
    console.log('Disconnesso dal server.')
    reconnect()
  })
}

// RICONNESSIONE
function reconnect() {
  console.log('Riconnessione tra 15 secondi...')

  aiStarted = false

  setTimeout(() => {
    startBot()
  }, 15000)
}

// INVIA MESSAGGIO
function sendChat(message) {
  if (!bot) return

  try {
    bot.chat(message)
    console.log('[BOT]', message)
  } catch (err) {
    console.log('Errore chat:', err.message)
  }
}

// MOVIMENTO CASUALE
function moveRandom() {
  if (!bot || !bot.entity) return

  const directions = [
    'forward',
    'back',
    'left',
    'right'
  ]

  const randomDirection =
    directions[Math.floor(Math.random() * directions.length)]

  bot.setControlState(randomDirection, true)

  setTimeout(() => {
    bot.setControlState(randomDirection, false)
  }, 1500)
}

// GUARDA IN GIRO
function lookAround() {
  if (!bot || !bot.entity) return

  const yaw = Math.random() * Math.PI * 2
  const pitch = (Math.random() - 0.5) * 0.8

  bot.look(yaw, pitch, true)
}

// SALTO
function jump() {
  if (!bot) return

  bot.setControlState('jump', true)

  setTimeout(() => {
    bot.setControlState('jump', false)
  }, 500)
}

// CHAT RANDOM
function randomChat() {
  if (!bot) return

  const messages = config.messages || [
    'SUCA',
    'DAVIDE STROZZATI',
    'VIVA I PROCIONI',
    'VUOI UN PROCIONE?'
  ]

  const randomMessage =
    messages[Math.floor(Math.random() * messages.length)]

  sendChat(randomMessage)
}

// AI BOT
function startAI() {
  console.log('AI avviata')

  setInterval(() => {
    moveRandom()
  }, config.moveInterval || 5000)

  setInterval(() => {
    lookAround()
  }, config.lookInterval || 3000)

  setInterval(() => {
    randomChat()
  }, config.chatInterval || 45000)
}

startBot()
