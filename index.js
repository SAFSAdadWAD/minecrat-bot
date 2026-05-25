const { createClient } = require('bedrock-protocol')

const client = createClient({
  host: 'procione.aternos.me',
  port: 29309,
  username: 'PROCIONE',
  offline: false,
  connectTimeout: 30000,
  profilesFolder: './auth'
})

console.log('Tentativo di connessione...')

client.on('join', () => {
  console.log('BOT ENTRATO NEL SERVER ✔')
})

client.on('spawn', () => {
  console.log('Spawn completato ✔')
})

client.on('play_status', (packet) => {
  console.log('Play status:', packet)
})

client.on('text', (packet) => {
  console.log('CHAT:', packet)
})

client.on('disconnect', (packet) => {
  console.log('DISCONNECT:')
  console.log(packet)
})

client.on('close', () => {
  console.log('Connessione chiusa')
})

client.on('error', (err) => {
  console.error('ERRORE COMPLETO:')
  console.error(err)
})
