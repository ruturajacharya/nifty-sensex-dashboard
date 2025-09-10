// server.js
import express from "express";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

// Load Telegram config if present
let tg = null;
try {
  tg = JSON.parse(fs.readFileSync("config.json", "utf8"));
} catch { console.log("No config.json found - skipping Telegram alerts"); }

// function: send Telegram message
async function sendAlert(msg) {
  if (!tg) return;
  const url = `https://api.telegram.org/bot${tg.token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: tg.chatID, text: msg })
  });
}

// last sent signals (to avoid spam)
const lastSignal = {};

app.get("/api/quotes", async (req, res) => {
  try {
    const symbols = encodeURIComponent("^NSEI,^BSESN");
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;
    const r = await fetch(url, { headers: { "User-Agent": "node" } });
    const data = await r.json();

    const results = data.quoteResponse?.result || [];
    for (const item of results) {
      const sym = item.symbol;
      const price = item.regularMarketPrice ?? 0;
      if (!price) continue;

      if (!global.history) global.history = {};
      if (!global.history[sym]) global.history[sym] = [];
      global.history[sym].push(price);
      if (global.history[sym].length > 200) global.history[sym].shift();

      const hist = global.history[sym];
      const ema = (arr, p) => {
        const k = 2 / (p + 1);
        let e = arr[0];
        for (let i = 1; i < arr.length; i++) e = arr[i] * k + e * (1 - k);
        return e;
      };
      const short = ema(hist, 5);
      const long = ema(hist, 13);

      // RSI (14)
      function rsi(arr, period = 14) {
        if (arr.length <= period) return null;
        let gains = 0, losses = 0;
        for (let i = arr.length - period; i < arr.length - 1; i++) {
          const diff = arr[i + 1] - arr[i];
          if (diff >= 0) gains += diff; else losses -= diff;
        }
        const avgGain = gains / period;
        const avgLoss = losses / period;
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - 100 / (1 + rs);
      }
      const rsiVal = rsi(hist);

      let signal = "HOLD";
      if (short && long) {
        if (short > long) signal = "BUY";
        else if (short < long) signal = "SELL";
      }

      if (rsiVal !== null) {
        if (signal === "BUY" && rsiVal > 70) signal = "OVERBOUGHT";
        if (signal === "SELL" && rsiVal < 30) signal = "OVERSOLD";
      }

      if (lastSignal[sym] !== signal) {
        lastSignal[sym] = signal;
        sendAlert(`${item.shortName} (${sym}) new signal: ${signal} at ₹${price}`);
      }

      item.signal = signal;
      item.rsi = rsiVal;
    }

    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.toString() });
  }
});

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
