const { createClient } = require('bedrock-protocol')

console.log('Tentativo di connessione...')

const client = createClient({
  host: 'procione.aternos.me',
  port: 29309,
  username: 'PROCIONE',

  // importante
  skipPing: true,

  // auth cache
  profilesFolder: './auth',

  // timeout più lungo
  connectTimeout: 60000
})

client.on('join', () => {
  console.log('BOT ENTRATO NEL SERVER ✔')
})

client.on('spawn', () => {
  console.log('Spawn completato ✔')
})

client.on('disconnect', (packet) => {
  console.log('Disconnesso:')
  console.log(packet)
})

client.on('close', () => {
  console.log('Connessione chiusa')
})

client.on('error', (err) => {
  console.error('ERRORE:')
  console.error(err)
})
