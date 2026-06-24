# 🤓 NerdBot — Discord Reaction Ranking System

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Discord](https://img.shields.io/badge/Discord-Bot-blue)
![Database](https://img.shields.io/badge/SQLite-Enabled-orange)
![Status](https://img.shields.io/badge/status-active-success)

A Discord bot that turns helpful community answers into a **reputation system** using 🤓 reactions.
Users earn points when others react to their messages with a specific emoji, creating a fun rewarding system. 

---

## Overview

NerdBot tracks helpful contributions in a Discord server.  
When a user reacts with 🤓 to a message, the author receives a point.  
The system includes a leaderboard, persistence, and basic abuse protection.

---

## 🚀 Features

- 🤓 Reaction-based scoring system
- 🏆 Live leaderboard (`/rank`)
- 📢 Hall-of-Nerds announcements
- 🧠 Thread + channel support
- 🔒 Anti-abuse protection (no duplicate rewards)
- 💾 SQLite persistence (local database)

---

## 🧠 How it works

1. A user posts a helpful message
2. Another user reacts with 🤓
3. The author receives +1 Nerd Point
4. A notification is sent referencing the original message
5. Points are stored in a database
6. Top users appear in `/rank`

---

## 📊 Commands

| Command | Description |
|--------|-------------|
| `/rank` | Shows top 10 users with highest Nerd score |

---

## 🛠️ Tech Stack

- Node.js
- discord.js v14
- SQLite (lightweight database)
- dotenv (environment security)

---

## 📂 Project Structure

```
nerd-bot/
│
├── index.js # Main bot logic
├── deploy-commands.js # Slash command registration
├── package.json
├── .env # (NOT pushed to GitHub)
├── .gitignore
└── nerds.db # (local database)
```

---

## 🔐 Environment Variables

Create a `.env` file in the project root:

TOKEN=your_discord_bot_token
CLIENT_ID=your_client_id
GUILD_ID=your_server_id
CODING_AREA_CATEGORY_ID=your_category_id
HALL_OF_NERDS_CHANNEL=your_channel_id

---

## ⚠️ Security

- `.env` is excluded from GitHub
- database is local (SQLite)
- no sensitive data is exposed in the repository

---

## 📌 Status

🟢 Active development  
🟢 Fully functional  
🟢 Ready for 24/7 deployment  

---

## 📈 Future Improvements

- [ ] Leveling system (XP tiers)
- [ ] Role rewards based on score thresholds