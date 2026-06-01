"use strict";

const { createClient } = require("bedrock-protocol");
const express = require("express");

const HOST = "procione.aternos.me";
const PORT = 29309;

let bot = null;
let isConnected = false;
let isConnecting = false;

function log(msg) {
  console.log(`[BOT] ${msg}`);
}

// =====================
// EXPRESS (Render keep alive)
// =====================
const app = express();
const HTTP_PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Bedrock bot is running");
});

app.get("/health", (req, res) => {
  res.json({
    connected: isConnected
  });
});

app.listen(HTTP_PORT, () => {
  log(`HTTP server running on port ${HTTP_PORT}`);
});

// =====================
// CONNECT BOT
// =====================
function connect() {
  if (isConnecting || isConnected) return;

  isConnecting = true;

  log(`Connecting to ${HOST}:${PORT}`);

  try {
    bot = createClient({
      host: HOST,
      port: PORT,
      username: "PROCIONE_" + Math.floor(Math.random() * 9999),
      offline: false
    });

    bot.on("connect", () => {
      isConnected = true;
      isConnecting = false;
      log("Connected to server");
    });

    bot.on("disconnect", () => {
      isConnected = false;
      isConnecting = false;
      log("Disconnected from server");
    });

    bot.on("error", (err) => {
      log("Error: " + (err.message || err));
      isConnected = false;
      isConnecting = false;
    });

  } catch (e) {
    log("Fatal connect error: " + e.message);
    isConnected = false;
    isConnecting = false;
  }
}

// =====================
// WATCHDOG (STABILE)
// =====================
setInterval(() => {
  if (!isConnected && !isConnecting) {
    log("Watchdog: reconnecting...");
    connect();
  }
}, 15000); // 🔥 NON 5 sec (troppo aggressivo)

// =====================
// START DELAY
// =====================
setTimeout(() => {
  connect();
}, 5000);
