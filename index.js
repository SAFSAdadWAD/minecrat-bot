const mineflayer = require('mineflayer')
const express = require('express')
const config = require('./config.json')

// ---------------- WEB ----------------
const app = express()
const PORT = process.env.PORT || 3000

app.get('/', (req, res) => res.send('Bot online 🤖'))

app.listen(PORT, () => {
  console.log('Web server attivo su', PORT)
})

// ---------------- BOT ----------------
let bot
let reconnecting = false
let aiStarted = false

function startBot() {
  console.log('Connessione PaperMC...')

  bot = mineflayer.createBot({
    host: config.host,
    port: Number(config.port),
    username: config.username,
    auth: 'offline'
  })

  bot.once('spawn', () => {
    console.log('Bot entrato nel server PaperMC!')
    bot.chat('Ciao 👋 sono online')

    aiStarted = true
    startAI()
  })

  bot.on('kicked', (r) => {
    console.log('Kicked:', r)
    safeReconnect()
  })

  bot.on('error', (e) => {
    console.log('Errore:', e.message)
    safeReconnect()
  })

  bot.on('end', () => {
    console.log('Disconnected')
    safeReconnect()
  })
}

// ---------------- RECONNECT ----------------
function safeReconnect() {
  if (reconnecting) return
  reconnecting = true

  console.log('Reconnect tra 10s...')

  aiStarted = false

  if (bot) {
    try { bot.end() } catch {}
    bot = null
  }

  setTimeout(() => {
    reconnecting = false
    startBot()
  }, 10000)
}

// ---------------- AI ----------------
function startAI() {
  console.log('AI attiva')

  setInterval(() => {
    if (!bot) return

    const moves = ['forward', 'left', 'right']
    const move = moves[Math.floor(Math.random() * moves.length)]

    bot.setControlState(move, true)

    setTimeout(() => {
      if (bot) bot.setControlState(move, false)
    }, 800)
  }, 2000)

  setInterval(() => {
    if (!bot) return

    const yaw = Math.random() * Math.PI * 2
    const pitch = (Math.random() - 0.5)

    bot.look(yaw, pitch, true)
  }, 1000)

  setInterval(() => {
    if (!bot) return

    const msgs = config.messages || ['Ciao 👋', 'Sto giocando']
    const msg = msgs[Math.floor(Math.random() * msgs.length)]

    bot.chat(msg)
  }, config.chatInterval || 45000)
}

// ---------------- START ----------------
startBot()
