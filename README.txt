Nifty & Sensex Live Dashboard (Quick Start)

Steps to run:
1. Install Node.js (v16+).
2. Inside this folder, run:
   npm init -y
   npm install express node-fetch
3. Fill your Telegram details in config.json (optional).
4. Run:
   node server.js
5. Open http://localhost:3000 in your browser.

Features:
- Live prices from Yahoo Finance (Nifty ^NSEI, Sensex ^BSESN)
- EMA crossover signals (5 vs 13)
- RSI(14) calculation
- Telegram alerts when signals change (optional)

Note: This is for educational/demo purposes only, not financial advice.
