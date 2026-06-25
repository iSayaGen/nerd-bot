# 🤓 NerdBot — Discord Reaction Ranking System

![Node.js](https://img.shields.io/badge/Runtime-Node.js-green)
![Discord](https://img.shields.io/badge/Discord-Bot-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-blue)
![Hosting](https://img.shields.io/badge/Render-Deployed-green)
![Status](https://img.shields.io/badge/status-active-success)

---

## Overview

NerdBot is a Discord bot that turns community engagement into a **reputation system** using 🤓 reactions.

Users earn points when others react to their messages, with a specific emoji, creating a fun rewarding system. 

The bot is deployed on **Render** and uses **Supabase PostgreSQL** for persistent cloud storage.

---

## 🚀 Features

- 🤓 Reaction-based reputation system
- 🏆 Live leaderboard (`/rank`)
- 📢 Hall-of-Nerds reward announcements
- 🔒 Anti-duplicate reaction protection
- 🧠 Thread + channel support
- ☁️ Persistent cloud database (Supabase PostgreSQL)
- 🚀 24/7 cloud hosting (Render)

---

## 🧠 XP System

Users gain XP by reacting with 🤓 to messages in the coding category.

XP thresholds:
- 1 XP → Initiate Nerd
- 5 XP → Core Nerd
- 20 XP → Quantum Nerd
- 50 XP → 1337 Nerd

---

## 🧠 How it works

1. A user posts a helpful message in a designated channel
2. Another user reacts with 🤓
3. The message author receives +1 Nerd Point (XP)
4. Points are stored in a database
5. The reaction is stored to prevent duplicates
6. A notification is sent referencing the original message
7. Top users appear in `/rank`

---

## 📊 Commands

| Command | Description |
|--------|-------------|
| `/rank` | Shows top 10 users with highest Nerd score |
| `/xp` | Shows your XP progress and next role |
| `/nerdstatus` | Shows your current Nerd rank and status message |

---

## 🏗️ Architecture

NerdBot is built with a modern production-ready stack:

- 🤖 Discord Bot (Node.js + discord.js)
- 🗄️ PostgreSQL Database (Supabase)
- ☁️ Cloud Hosting (Render)
- 🔄 Continuous Deployment (GitHub → Render)
- 💾 Persistent Data Storage
- 🌐 Web Service (keep-alive endpoint for uptime)

This setup ensures scalability, persistence, and real-time responsiveness.

---

## 📂 Project Structure

```
nerd-bot/
│
├── index.js # Main bot logic
├── deploy-commands.js # Slash command registration
├── package.json
├── .env # Local environment variables (NOT pushed)
├── .gitignore
├── scripts/
│ └── export-db.js # Migration script (local only)
```

---

## 🔐 Environment Variables

Create a `.env` file in the project root:

```
TOKEN=your_discord_bot_token
CLIENT_ID=your_client_id
GUILD_ID=your_server_id
CODING_AREA_CATEGORY_ID=your_category_id
HALL_OF_NERDS_CHANNEL=your_channel_id
DATABASE_URL=your_supabase_connection_string
ROLE_NERD_1337=role_id
ROLE_QUANTUM_NERD=role_id
ROLE_CORE_NERD=role_id
ROLE_INITIATE_NERD=role_id
```

---

## ⚙️ Required Discord Roles

You must create the following roles and add their IDs to your `.env`:

- ROLE_NERD_1337
- ROLE_QUANTUM_NERD
- ROLE_CORE_NERD
- ROLE_INITIATE_NERD

⚠️ These are required for the XP system to function correctly.

## ☁️ Deployment (Render)

The bot is deployed as a **Render Web Service**.

### Build command:

npm install

### Start command

node index.js

Render automatically redeploys when changes are pushed to GitHub.

After updating `.env`, always restart the bot to apply role changes.

---

## 🗄️ Database

- Uses Supabase PostgreSQL
- Stores user scores and reaction tracking
- Fully persistent across restarts and deployments

---

## ⚠️ Security

- `.env` is excluded from GitHub
- Database credentials stored in environment variables
- no sensitive data is exposed in the repository
- Reaction spam prevention via database tracking

---

## 📌 Status

🟢 Active development  
🟢 Fully functional  
🟢 Production-ready architecture

---

## 📈 Future Improvements

- [ ] Leveling system (XP tiers)
- [ ] Role rewards based on score thresholds