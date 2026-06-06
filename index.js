const mineflayer = require('mineflayer')
const config = require('./config.json')

let bot
let aiStarted = false

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
      bot.chat('Sono un bot AI')
    }

    if (msg.includes('salta')) {
      jump()
    }
  })

  bot.on('kicked', reason => {
    console.log('Kick:', reason)
    reconnect()
  })

  bot.on('error', err => {
    console.log('Errore:', err.message)
  })

  bot.on('end', () => {
    console.log('Disconnesso.')
    reconnect()
  })
}

function reconnect() {
  console.log('Riconnessione tra 15 secondi...')

  aiStarted = false

  setTimeout(() => {
    startBot()
  }, 15000)
}

function randomLook() {
  const yaw = Math.random() * Math.PI * 2
  const pitch = (Math.random() - 0.5) * 0.8

  bot.look(yaw, pitch, true)
}

function randomMove() {
  const actions = ['forward', 'back', 'left', 'right']

  const action =
    actions[Math.floor(Math.random() * actions.length)]

  bot.setControlState(action, true)

  setTimeout(() => {
    bot.setControlState(action, false)
  }, 1500)
}

function jump() {
  bot.setControlState('jump', true)

  setTimeout(() => {
    bot.setControlState('jump', false)
  }, 500)
}

function randomChat() {
  const messages = config.messages

  const msg =
    messages[Math.floor(Math.random() * messages.length)]

  bot.chat(msg)
}

function startAI() {
  console.log('AI avviata')

  setInterval(randomMove, config.moveInterval || 5000)
  setInterval(randomLook, config.lookInterval || 3000)
  setInterval(randomChat, config.chatInterval || 45000)
}

startBot()
