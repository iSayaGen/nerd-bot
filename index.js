require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();

// =====================
// 📦 IMPORTS
// =====================
const { Client, GatewayIntentBits, Events, Partials, EmbedBuilder } = require('discord.js');
const { Pool } = require('pg');
const express = require('express');

// =====================
// 🌐 KEEP-ALIVE SERVER (RENDER FIX)
// Required because Render Web Services expect a port
// =====================
const app = express();

app.get("/", (req, res) => {
  res.send("NerdBot is running 🤓");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Keep-alive server running on port ${PORT}`);
});

// =====================
// 🤖 DISCORD CLIENT SETUP
// =====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

// =====================
// 🗄️ POSTGRES DATABASE (SUPABASE)
// =====================
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4
});

// =====================
// ⚙️ CONFIG
// =====================
const CODING_AREA_CATEGORY_ID = process.env.CODING_AREA_CATEGORY_ID;
const HALL_OF_NERDS_CHANNEL = process.env.HALL_OF_NERDS_CHANNEL;

// =====================
// 🏆 ROLE CONFIG
// =====================
const ROLE_NERD_1337 = process.env.ROLE_NERD_1337;
const ROLE_QUANTUM_NERD = process.env.ROLE_QUANTUM_NERD;
const ROLE_CORE_NERD = process.env.ROLE_CORE_NERD;
const ROLE_INITIATE_NERD = process.env.ROLE_INITIATE_NERD;

// when bot restarts rank messages are not triggered
let isInitialSyncDone = false;

// cached ranking state (for diff checking)
let lastRanking = [];

const lastRoleMap = new Map();

function getRankMessage(roleId) {
  switch (roleId) {
    case ROLE_NERD_1337:
      return `👑 **SYSTEM OVERRIDE COMPLETE**

Du hast den höchsten bekannten Nerd-Level erreicht.

Status: **NERD 1337**
Zugriff: Root knowledge unlocked
Reputation: Legendary

Die Matrix erkennt dich als Anomalie der Intelligenz.

🤓 Willkommen an der Spitze.`;

    case ROLE_QUANTUM_NERD: // (Quantum Nerd)
      return `🧠 **QUANTUM UPGRADE DETECTED**

Dein Denkmodell hat die klassische Logik verlassen.

Status: **Quantum Nerd**
Effekt: Parallelgedanken aktiviert
Bonus: Realität leicht instabil

Du beginnst, Lösungen zu sehen, bevor Probleme entstehen.`;

    case ROLE_CORE_NERD: // (Core Nerd)
      return `⚡ **CORE SYSTEM ACTIVATED**

Du bist jetzt ein stabiler Bestandteil des Nerd-Netzwerks.

Status: Core Nerd
Zugriff: Erweiterte Denkpfade freigeschaltet
Performance: Überdurchschnittlich konstant

Du bist kein Anfänger mehr — du bist Infrastruktur.`;

    case ROLE_INITIATE_NERD: // (Initiate Nerd)
      return `🎓 **INITIATION COMPLETE**

Du wurdest ins Nerd-System aufgenommen.

Status: **Initiate Nerd**
Zugriff: Basismodule aktiviert
Mission: Lernen, bauen, wachsen

Jeder Experte war einmal hier.`;

    default:
      return null;
  }
}

// =====================
// 🚀 BOT READY EVENT
// =====================
client.once(Events.ClientReady, async () => {
  console.log("====================================");
  console.log("🤖 BOT READY:", client.user.tag);
  console.log("====================================");
  console.log("🧪 DEBUG: Bot ready event fired"); // temp log debugging 1

  // 🔥 INITIAL ROLE SYNC ON START (IMPORTANT)
  try {
    console.log("🧠 Running initial role sync...");

    const guild = client.guilds.cache.first();
    if (guild) {
      await syncRoles(guild);
    }

  } catch (err) {
    console.log("❌ Initial role sync failed:", err);
  }
});

// =====================
// 📍 HELPER: CATEGORY DETECTION
// =====================
function getCategory(message) {
  console.log("🧪 DEBUG: getCategory called"); // temp log debugging 1
  if (message.channel.isThread?.()) {
    console.log("🧪 DEBUG: Thread detected"); // temp log debugging 1
    return message.channel.parent?.parent;
  }
  console.log("🧪 DEBUG: Normal channel detected"); // temp log debugging 1
  return message.channel.parent;
}

// =====================
// 🧠 ROLE SYNC (DIFF BASED)
// =====================
async function syncRoles(guild) {
  try {
    const result = await db.query(
      `SELECT userid FROM nerds ORDER BY count DESC`
    );

    const rows = result.rows;

    // neue Reihenfolge
    const newRanking = rows.map(r => r.userid).filter(Boolean);

    // alte Reihenfolge
    const oldRanking = lastRanking;

    // vergleichen
    if (oldRanking.join(",") === newRanking.join(",")) {
      console.log("🧠 Rank unchanged -> skipping role update");
      return;
    }

    console.log("🔄 Rank changed -> updating roles");

    // cache updaten
    lastRanking = newRanking;

    for (let i = 0; i < rows.length; i++) {
      let member;

      try {
        member = await guild.members.fetch(rows[i].userid);
      } catch (err) {
        console.log("⚠️ Member not found:", rows[i].userid);
        continue;
      }

      if (!member || !member.roles) {
        console.log("⚠️ Invalid member object:", rows[i].userid);
        continue;
      }

      const oldRole = lastRoleMap.get(member.id);

      let newRole = ROLE_INITIATE_NERD;

      if (i === 0) newRole = ROLE_NERD_1337;
      else if (i === 1) newRole = ROLE_QUANTUM_NERD;
      else if (i === 2) newRole = ROLE_CORE_NERD;

      // remove all roles
      await member.roles.remove([
        ROLE_NERD_1337,
        ROLE_QUANTUM_NERD,
        ROLE_CORE_NERD,
        ROLE_INITIATE_NERD
      ]).catch(() => {});

      // add new role
      await member.roles.add(newRole).catch(() => {});

      // =========================
      // 📢 ROLE UPGRADE MESSAGE
      // =========================

      if (isInitialSyncDone && oldRole !== newRole) {
        const channel = await client.channels.fetch(HALL_OF_NERDS_CHANNEL).catch(() => null);

        const msg = getRankMessage(newRole);

        if (channel && msg) {
          channel.send({
            content: `📈 <@${member.id}>\n\n${msg}`
          }).catch(() => {});
        }
      }

      lastRoleMap.set(member.id, newRole);
    }

    console.log("🏁 Roles synced");

    isInitialSyncDone = true;
    console.log("🧠 Initial role sync completed (notifications enabled)");

  } catch (err) {
    console.log("❌ syncRoles error:", err);
  }
}

// =====================
// 🤓 REACTION ADDED EVENT
// =====================
client.on(Events.MessageReactionAdd, async (reaction, user) => {

  console.log("\n🤓 Reaction detected:", user.id);
  console.log("🧪 DEBUG: Reaction event triggered"); // temp log debugging 1

  if (user.bot) {
    console.log("🧪 DEBUG: Bot user ignored"); // temp log debugging 1
    return;
  }

  if (reaction.emoji.name !== '🤓') {
    console.log("🧪 DEBUG: Wrong emoji:", reaction.emoji.name); // temp log debugging 1
    return;
  }

  try {
    console.log("🧪 DEBUG: Fetching message"); // temp log debugging 1

    const message = await reaction.message.fetch({ force: true });

    console.log("🧪 DEBUG: Message fetched"); // temp log debugging 1

    const author = message.author;

    console.log("🧪 DEBUG: Author:", author?.id); // temp log debugging 1

    if (!author || author.bot) {
      console.log("🧪 DEBUG: Invalid author"); // temp log debugging 1
      return;
    }

    if (author.id === user.id) {
      console.log("🧪 DEBUG: Self reaction blocked"); // temp log debugging 1
      return;
    }

    const category = getCategory(message);

    console.log("🧪 DEBUG: Category ID:", category?.id); // temp log debugging 1
    console.log("🧪 DEBUG: Expected Category:", CODING_AREA_CATEGORY_ID); // temp log debugging 1

    if (category?.id !== CODING_AREA_CATEGORY_ID) {
      console.log("🧪 DEBUG: Wrong category -> exit"); // temp log debugging 1
      return;
    }

    // 🔍 check duplicate reaction
    console.log("🧪 DEBUG: Checking duplicate reaction");

    let check;

    try {
      check = await db.query(
        `SELECT 1 FROM reactions WHERE messageid = $1 AND reactorid = $2`,
        [message.id, user.id]
      );
    } catch (err) {
      console.log("⚠️ reactions table missing -> skipping duplicate check"); // temp log debugging 1
      check = { rows: [] };
    }

    if (check.rows.length > 0) {
      console.log("🧪 DEBUG: Duplicate reaction blocked"); // temp log debugging 1
      return;
    }

    console.log("🧪 DEBUG: No duplicate found"); // temp log debugging 1

    // 💾 store reaction
    console.log("💾 trying DB update for:", author.id);

    console.log("🧪 DEBUG: Inserting reaction into DB"); // temp log debugging 1

    await db.query(
      `INSERT INTO reactions (messageid, reactorid) VALUES ($1, $2)`,
      [message.id, user.id]
    );

    // ➕ increase nerd score
    console.log("🧪 DEBUG: Updating nerd score for:", author.id); // temp log debugging 1

    await db.query(
      `INSERT INTO nerds (userid, count)
       VALUES ($1, 1)
       ON CONFLICT (userid)
       DO UPDATE SET count = nerds.count + 1`,
      [author.id]
    );

    console.log("🧪 DEBUG: DB update completed"); // temp log debugging 1

    // 📢 send hall-of-nerds message
    console.log("🧪 DEBUG: Sending hall message"); // temp log debugging 1

    await sendHallMessage(author, message);

  } catch (err) {
    console.log("❌ ADD ERROR:", err);
  }
});

// =====================
// ➖ REACTION REMOVED EVENT
// =====================
client.on(Events.MessageReactionRemove, async (reaction, user) => {

  console.log("\n➖ Reaction removed:", user.id);
  console.log("🧪 DEBUG: Reaction remove event triggered"); // temp log debugging 1

  if (user.bot) return;
  if (reaction.emoji.name !== '🤓') return;

  try {
    const message = await reaction.message.fetch({ force: true });

    console.log("🧪 DEBUG: Message fetched (remove)"); // temp log debugging 1

    const category = getCategory(message);

    console.log("🧪 DEBUG: Category (remove):", category?.id); // temp log debugging 1

    if (category?.id !== CODING_AREA_CATEGORY_ID) return;

    const author = message.author;

    console.log("🧪 DEBUG: Author (remove):", author?.id); // temp log debugging 1

    if (!author || author.bot) return;

    // 🔍 check if reaction exists
    console.log("🧪 DEBUG: Checking reaction exists");

    let check;

    try {
      check = await db.query(
        `SELECT 1 FROM reactions WHERE messageid = $1 AND reactorid = $2`,
        [message.id, user.id]
      );
    } catch (err) {
      console.log("⚠️ reactions table missing -> skipping exists check"); // temp log debugging 1
      check = { rows: [] };
    }

    if (check.rows.length === 0) return;

    console.log("🧪 DEBUG: Reaction exists -> removing");; // temp log debugging 1

    // ❌ delete reaction record
    await db.query(
      `DELETE FROM reactions WHERE messageid = $1 AND reactorid = $2`,
      [message.id, user.id]
    );

    // ➖ decrease nerd score safely
    await db.query(
      `UPDATE nerds
       SET count = CASE WHEN count > 0 THEN count - 1 ELSE 0 END
       WHERE userid = $1`,
      [author.id]
    );

    console.log("🧪 DEBUG: Nerd score decreased"); // temp log debugging 1

  } catch (err) {
    console.log("❌ REMOVE ERROR:", err);
  }
});

// =====================
// 📢 HALL OF NERDS MESSAGE
// =====================
async function sendHallMessage(author, message) {
  try {
    console.log("🧪 DEBUG: sendHallMessage called"); // temp log debugging 1

    const channel = await client.channels.fetch(HALL_OF_NERDS_CHANNEL);

    console.log("🧪 DEBUG: Hall channel fetched"); // temp log debugging 1

    if (!channel?.isTextBased()) return;

    const link = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;

    const title = message.channel.isThread()
      ? message.channel.name
      : message.channel.name;

    console.log("🧪 DEBUG: Sending message to hall channel"); // temp log debugging 1

    await channel.send({
      content:
        `🎉 <@${author.id}> hat sich ein Nerd verdient 🤓\n` +
        `💬 Quelle: **${title}**\n` +
        `🔗 ${link}`
    });

    console.log("🧪 DEBUG: Hall message sent"); // temp log debugging 1

  } catch (err) {
    console.log("❌ HALL ERROR:", err);
  }
}

// =====================
// 🏆 /rank COMMAND
// =====================
client.on(Events.InteractionCreate, async interaction => {

  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'rank') return;

  console.log("⚡ /rank triggered by:", interaction.user.id);
  console.log("🧪 DEBUG: Rank command triggered"); // temp log debugging 1

  try {
    await interaction.deferReply();

    console.log("🧪 DEBUG: Fetching leaderboard"); // temp log debugging 1

    // 📊 fetch leaderboard
    const result = await db.query(
      `SELECT * FROM nerds ORDER BY count DESC LIMIT 10`
    );

    const rows = result.rows;

    console.log("🧪 DEBUG: Rows fetched:", rows.length); // temp log debugging 1

    let desc = "";

    for (let i = 0; i < rows.length; i++) {
      try {
        const member = await interaction.guild.members.fetch(rows[i].userid);

        const medal = ["🥇","🥈","🥉"][i] || "🔹";

        desc += `${medal} **${member.displayName}** — 🤓 ${rows[i].count}\n`;

      } catch {
        desc += `🔹 Unknown — 🤓 ${rows[i].count}\n`;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle("🏆 Nerd Leaderboard")
      .setColor(0x5865F2)
      .setDescription(desc || "Noch keine Nerds!");

    await interaction.editReply({ embeds: [embed] });

    console.log("🧪 DEBUG: Rank response sent"); // temp log debugging 1

  } catch (err) {
    console.log("❌ RANK ERROR:", err);
  }
});

// =====================
// 🧠 /nerdstatus COMMAND
// =====================
client.on(Events.InteractionCreate, async interaction => {

  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'nerdstatus') return;

  try {
    const member = await interaction.guild.members.fetch(interaction.user.id);

    // Rolle bestimmen
    let roleId = null;

    if (member.roles.cache.has(ROLE_NERD_1337)) roleId = ROLE_NERD_1337;
    else if (member.roles.cache.has(ROLE_QUANTUM_NERD)) roleId = ROLE_QUANTUM_NERD;
    else if (member.roles.cache.has(ROLE_CORE_NERD)) roleId = ROLE_CORE_NERD;
    else roleId = ROLE_INITIATE_NERD;

    const msg = getRankMessage(roleId);

    if (!msg) {
      return interaction.reply({
        content: "❌ Kein Status gefunden.",
        ephemeral: true
      });
    }

    await interaction.reply({
      content: `📊 Dein aktueller Nerd-Status:\n\n>>> ${msg}`,
      ephemeral: false
    });

  } catch (err) {
    console.log("❌ NERDSTATUS ERROR:", err);
    await interaction.reply({
      content: "❌ Fehler beim Laden deines Status.",
      ephemeral: true
    });
  }
});

// =====================
// 🔑 LOGIN
// =====================
client.login(process.env.TOKEN);