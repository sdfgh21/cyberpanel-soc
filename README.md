# 🛡️ CyberPanel — SOC Threat Intelligence Dashboard v2.1

Professional real-time Cyber Threat Intelligence platform for SOC teams.

## ✨ Features

| Feature | Description |
|---|---|
| 📰 **Threat News** | Live RSS: BleepingComputer, THN, Dark Reading, CISA, Krebs, Schneier |
| 🐛 **CVE Feed** | Real-time NVD CVEs with CVSS scoring |
| ⚠️ **CISA KEV** | 1600+ actively exploited vulnerabilities |
| 🌐 **IOC Feed** | ThreatFox + URLhaus indicators |
| 👁️ **VirusTotal** | Scan IPs, domains, hashes, URLs |
| 🗺️ **Threat Map** | Animated global threat visualization |
| 🔍 **Web Scanner** | Security headers, SSL, DNS, reputation, score A-F |
| ⚡ **Alert Rules** | Auto-trigger alerts based on conditions |
| 🤖 **Telegram Bot** | Mobile push notifications |
| 🔔 **Discord** | Webhook alerts for critical findings |
| 🖥️ **Assets** | Asset inventory linked to CVEs |
| 📄 **Reports** | HTML reports with recommendations |
| ⌨️ **Ctrl+K** | Command palette navigation |
| 🔐 **Auth** | JWT, multi-user, roles |

## 🚀 Quick Start (Local)

**Windows:** Double-click `start.bat`

**Linux/Mac:**
```bash
chmod +x start.sh && ./start.sh
```

Access: http://localhost:3000 — Login: `admin` / `admin123`

## 🚂 Deploy to Railway (Free)

1. Push to GitHub
2. Railway → Deploy from GitHub → set Root Directory to `backend`
3. Add second service → same repo → Root Directory `frontend`
4. Set variables (see below)

### Backend Variables
```
JWT_SECRET=cyberpanel_soc_stable_secret_key_2026
NODE_ENV=production
VIRUSTOTAL_API_KEY=    (free: virustotal.com)
ABUSEIPDB_API_KEY=     (free: abuseipdb.com)
TELEGRAM_BOT_TOKEN=    (from @BotFather)
TELEGRAM_CHAT_ID=      (from getUpdates)
DISCORD_WEBHOOK_URL=   (from Discord channel)
```

### Frontend Variables
```
VITE_API_URL=https://your-backend.railway.app
```

## 🌐 Live URLs
- Frontend: zealous-unity-production-1492.up.railway.app
- Backend:  cyberpanel-soc-production.up.railway.app

## 📁 Structure
```
cyber-panel/
├── backend/          Node.js + Express + SQLite
│   ├── routes/       15 API route files
│   ├── middleware/   JWT auth
│   ├── database.js   sql.js (no C++ needed)
│   └── server.js     Main entry + cron jobs
├── frontend/         React + Vite + Tailwind
│   └── src/
│       ├── components/  Layout, Sidebar, CommandPalette
│       ├── pages/       15 page components
│       ├── hooks/       useAuth
│       └── utils/       api.js, helpers.jsx
├── start.bat         Windows launcher
├── start.sh          Linux/Mac launcher
└── README.md
```
