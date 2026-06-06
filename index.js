const bedrock = require('bedrock-protocol')
const config = require('./config.json')

let client = null
let runtimeId = null
let pos = {
  x: 0,
  y: 100,
  z: 0
}

let aiStarted = false

function startBot() {
  console.log('Tentativo di connessione...')

  client = bedrock.createClient({
    host: config.host,
    port: config.port,
    username: config.username,
    offline: true
  })

  client.on('start_game', (packet) => {
    console.log('Bot connesso!')

    runtimeId = packet.runtime_entity_id

    pos = {
      x: packet.player_position.x,
      y: packet.player_position.y,
      z: packet.player_position.z
    }

    sendChat('Ciao! Sono online 🤖')

    if (!aiStarted) {
      aiStarted = true
      startAI()
    }
  })

  client.on('text', (packet) => {
    const username = packet.source_name || 'Giocatore'
    const msg = packet.message?.toLowerCase() || ''

    console.log(`[CHAT] ${username}: ${msg}`)

    if (msg.includes('ciao')) {
      sendChat(`Ciao ${username}! 👋`)
    }

    if (msg.includes('come stai')) {
      sendChat('Sto bene 😄')
    }

    if (msg.includes('chi sei')) {
      sendChat('Sono un bot AI Bedrock')
    }

    if (msg.includes('salta')) {
      sendChat('Boing 😄')
      jump()
    }
  })

  client.on('disconnect', () => {
    console.log('Disconnesso dal server.')
    reconnect()
  })

  client.on('error', (err) => {
    console.log('Errore:', err.message)
    reconnect()
  })
}

function reconnect() {
  console.log('Riconnessione tra 15 secondi...')

  runtimeId = null
  aiStarted = false

  setTimeout(() => {
    startBot()
  }, 15000)
}

function sendChat(message) {
  if (!client) return

  try {
    client.queue('text', {
      type: 'chat',
      needs_translation: false,
      source_name: config.username,
      message,
      xuid: '',
      platform_chat_id: ''
    })

    console.log('[BOT]', message)
  } catch (err) {
    console.log('Errore chat:', err.message)
  }
}

function sendMovement(yaw, pitch) {
  if (!client || !runtimeId) return

  try {
    client.queue('move_player', {
      runtime_entity_id: runtimeId,
      position: pos,
      pitch,
      yaw,
      head_yaw: yaw,
      mode: 0,
      on_ground: true,
      ridden_runtime_entity_id: 0,
      tick: Date.now()
    })
  } catch (err) {
    console.log('Errore movimento:', err.message)
  }
}

function moveRandom() {
  if (!runtimeId) return

  pos.x += (Math.random() - 0.5) * 3
  pos.z += (Math.random() - 0.5) * 3

  const yaw = Math.random() * 360
  const pitch = -20 + Math.random() * 40

  sendMovement(yaw, pitch)
}

function lookAround() {
  if (!runtimeId) return

  const yaw = Math.random() * 360
  const pitch = -25 + Math.random() * 50

  sendMovement(yaw, pitch)
}

function jump() {
  if (!runtimeId) return

  pos.y += 1

  sendMovement(
    Math.random() * 360,
    0
  )

  setTimeout(() => {
    pos.y -= 1
  }, 500)
}

function randomChat() {
  if (!client) return

  const messages = config.messages || [
    'Ciao 👋',
    'Sto esplorando...',
    'Bel server 😄',
    'Qualcuno online?'
  ]

  const randomMessage =
    messages[Math.floor(Math.random() * messages.length)]

  sendChat(randomMessage)
}

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
