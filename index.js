const bedrock = require('bedrock-protocol')
const config = require('./config.json')

let runtimeId = null
let pos = { x: 0, y: 100, z: 0 }

const client = bedrock.createClient({
  host: config.host,
  port: config.port,
  username: config.username,
  offline: true
})

function chat(message) {
  try {
    client.queue('text', {
      type: 'chat',
      needs_translation: false,
      source_name: config.username,
      message,
      xuid: '',
      platform_chat_id: ''
    })

    console.log('[CHAT]', message)
  } catch (err) {
    console.error('Errore chat:', err.message)
  }
}

client.on('start_game', packet => {
  runtimeId = packet.runtime_entity_id

  pos = {
    x: packet.player_position.x,
    y: packet.player_position.y,
    z: packet.player_position.z
  }

  console.log('Bot connesso!')

  chat('Ciao! Sono online 🤖')

  startAI()
})

client.on('text', packet => {
  const username = packet.source_name || 'Unknown'
  const msg = packet.message?.toLowerCase() || ''

  console.log(`${username}: ${msg}`)

  if (msg.includes('ciao')) {
    chat(`Ciao ${username}! 👋`)
  }

  if (msg.includes('come stai')) {
    chat('Sto bene 😄')
  }

  if (msg.includes('chi sei')) {
    chat('Sono un bot AI Bedrock')
  }
})

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
  const pitch = -20 + Math.random() * 40

  sendMovement(yaw, pitch)
}

function sendMovement(yaw, pitch) {
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
    console.error('Errore movimento:', err.message)
  }
}

function randomChat() {
  const messages = config.messages
  const msg = messages[Math.floor(Math.random() * messages.length)]

  chat(msg)
}

function startAI() {
  setInterval(moveRandom, config.moveInterval)
  setInterval(lookAround, config.lookInterval)
  setInterval(randomChat, config.chatInterval)
}

client.on('disconnect', () => {
  console.log('Bot disconnesso')
})

client.on('error', err => {
  console.error('Errore:', err)
})
