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

## 🧠 How it works

1. A user posts a helpful message in a designated channel
2. Another user reacts with 🤓
3. The message author receives +1 Nerd Point
4. Points are stored in a database
5. The reaction is stored to prevent duplicates
6. A notification is sent referencing the original message
7. Top users appear in `/rank`

---

## 📊 Commands

| Command | Description |
|--------|-------------|
| `/rank` | Shows top 10 users with highest Nerd score |

---

## 🛠️ Tech Stack

- Node.js
- discord.js v14
- PostgreSQL (Supabase)
- Render (hosting platform)
- dotenv (environment configuration)

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
```

---

## ☁️ Deployment (Render)

The bot is deployed as a **Render Web Service**.

### Build command:

npm install

### Start command

node index.js

Render automatically redeploys when changes are pushed to GitHub.

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