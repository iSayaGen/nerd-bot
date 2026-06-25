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

app.all("/", (req, res) => {
  console.log(`🌐 Uptime ping received (${req.method})`);
  res.status(200).send("NerdBot is running 🤓");
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

console.log("🧠 ROLE CHECK:");
console.log({
  ROLE_NERD_1337,
  ROLE_QUANTUM_NERD,
  ROLE_CORE_NERD,
  ROLE_INITIATE_NERD
});

// =====================
// 🧠 XP ROLE SYSTEM
// =====================
function getRoleByXP(xp) {
  if (xp >= 50) return ROLE_NERD_1337;
  if (xp >= 20) return ROLE_QUANTUM_NERD;
  if (xp >= 5) return ROLE_CORE_NERD;
  if (xp >= 1) return ROLE_INITIATE_NERD;
  return ROLE_INITIATE_NERD;
}

function getNextRoleInfo(xp) {
  if (xp < 1) return { next: 1, role: "INITIATE NERD" };
  if (xp < 5) return { next: 5, role: "CORE NERD" };
  if (xp < 20) return { next: 20, role: "QUANTUM NERD" };
  if (xp < 50) return { next: 50, role: "NERD 1337" };
  return { next: null, role: "MAX LEVEL" };
}

// =====================
// ⚡ LEVEL UP CHECK SYSTEM
// =====================

// checks if a user crosses a milestone and triggers role update + message
async function checkLevelUp(userId, newXp, oldXp) {

  // XP milestones
  const milestones = [1, 5, 20, 50];

  // find if a milestone was crossed
  const crossed = milestones.find(m => oldXp < m && newXp >= m);

  if (!crossed) return; // no level up

  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  if (!guild) return;

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;

  // determine role
  const newRole = getRoleByXP(newXp);

  // remove old nerd roles
  try {
    await member.roles.remove([
      ROLE_NERD_1337,
      ROLE_QUANTUM_NERD,
      ROLE_CORE_NERD,
      ROLE_INITIATE_NERD
    ]);
    console.log("🧹 ROLES REMOVED:", member.user.tag);
  } catch (err) {
    console.log("❌ ROLE REMOVE FAILED:", err.message);
  }

  // add new role
  try {
    await member.roles.add(newRole);
    console.log("➕ ROLE ADDED:", member.user.tag, newRole);
  } catch (err) {
    console.log("❌ ROLE ADD FAILED:", member.user.tag);
    console.log("❌ REASON:", err.message);
  }

  // send level up message
  const channel = await client.channels.fetch(HALL_OF_NERDS_CHANNEL).catch(() => null);

  const msg = getRankMessage(newRole);

  if (channel && msg) {
    channel.send({
      content: `🚀 <@${userId}> hat Level ${crossed} XP erreicht!\n\n${msg}`
    }).catch(() => {});
  }

  // DEBUG
  console.log(`⚡ LEVEL UP: ${userId} reached ${crossed} XP`);
}

// =====================
// 🔥 STATE
// =====================
let isInitialSyncDone = false;

// cached ranking state (for diff checking)
let lastRanking = [];
const lastRoleMap = new Map();

// =====================
// 🏆 ROLE MESSAGES
// =====================
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

    case ROLE_QUANTUM_NERD:
      return `🧠 **QUANTUM UPGRADE DETECTED**

Dein Denkmodell hat die klassische Logik verlassen.

Status: **Quantum Nerd**
Effekt: Parallelgedanken aktiviert
Bonus: Realität leicht instabil

Du beginnst, Lösungen zu sehen, bevor Probleme entstehen.`;

    case ROLE_CORE_NERD:
      return `⚡ **CORE SYSTEM ACTIVATED**

Du bist jetzt ein stabiler Bestandteil des Nerd-Netzwerks.

Status: Core Nerd
Zugriff: Erweiterte Denkpfade freigeschaltet
Performance: Überdurchschnittlich konstant

Du bist kein Anfänger mehr — du bist Infrastruktur.`;

    case ROLE_INITIATE_NERD:
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

    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    if (guild) {
      await syncRoles(guild);
    }

  } catch (err) {
    console.log("❌ Initial role sync failed:", err);
  }
});

// =====================
// 🧠 ROLE SYNC (XP BASED)
// =====================
async function syncRoles(guild) {
  try {
    console.log("🧠 syncRoles START");

    const result = await db.query(`SELECT userid, count FROM nerds`);
    const rows = result.rows;

    console.log(`📦 Found ${rows.length} users in DB`);

    for (const row of rows) {
      console.log("\n----------------------------");
      console.log("🧠 USER:", row.userid, "XP:", row.count);

      let member;

      try {
        member = await guild.members.fetch(row.userid);
        console.log("✅ MEMBER FOUND:", member.user.tag);
      } catch (err) {
        console.log("❌ MEMBER FETCH FAILED:", row.userid);
        console.log(err?.message);
        continue;
      }

      const xp = Number(row.count);
      const newRole = getRoleByXP(xp);

      console.log("🎯 ROLE TARGET:", newRole);

      try {
        // remove all nerd roles
        await member.roles.remove([
          ROLE_NERD_1337,
          ROLE_QUANTUM_NERD,
          ROLE_CORE_NERD,
          ROLE_INITIATE_NERD
        ]);

        console.log("🧹 OLD ROLES REMOVED");

        // add correct role
        await member.roles.add(newRole);

        console.log("➕ ROLE ADDED:", newRole);

      } catch (err) {
        console.log("❌ ROLE UPDATE FAILED for", member.user.tag);
        console.log(err);
        continue;
      }

      const oldRole = lastRoleMap.get(member.id);
      if (oldRole !== newRole) {
        console.log("📈 ROLE CHANGE:", oldRole, "→", newRole);
      }

      lastRoleMap.set(member.id, newRole);
    }

    console.log("\n🏁 SYNC COMPLETE");
    isInitialSyncDone = true;

  } catch (err) {
    console.log("❌ syncRoles GLOBAL ERROR:", err);
  }
}

// =====================
// 🤓 REACTION ADD
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
    } catch {
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

    // get old XP first
    const oldResult = await db.query(
      `SELECT count FROM nerds WHERE userid = $1`,
      [author.id]
    );

    const oldXp = oldResult.rows[0]?.count || 0;

    // update XP
    const newResult = await db.query(
      `INSERT INTO nerds (userid, count)
      VALUES ($1, 1)
      ON CONFLICT (userid)
      DO UPDATE SET count = nerds.count + 1
      RETURNING count`,
      [author.id]
    );

    const newXp = newResult.rows[0].count;

    // =====================
    // ⚡ LEVEL UP CHECK (NEW)
    // =====================
    await checkLevelUp(author.id, newXp, oldXp);

    console.log("🧪 DEBUG: DB update completed"); // temp log debugging 1

    // 📢 send hall-of-nerds message
    console.log("🧪 DEBUG: Sending hall message"); // temp log debugging 1

    await sendHallMessage(author, message);

  } catch (err) {
    console.log("❌ ADD ERROR:", err);
  }
});

// =====================
// 🤓 REACTION REMOVE
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
// 📢 HALL MESSAGE
// =====================
async function sendHallMessage(author, message) {
  try {
    console.log("🧪 DEBUG: sendHallMessage called"); // temp log debugging 1

    const channel = await client.channels.fetch(HALL_OF_NERDS_CHANNEL);

    console.log("🧪 DEBUG: Hall channel fetched"); // temp log debugging 1

    if (!channel?.isTextBased()) return;

    const link = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;

    console.log("🧪 DEBUG: Sending message to hall channel"); // temp log debugging 1
    
    await channel.send({
      content:
        `🎉 <@${author.id}> hat sich ein Nerd verdient 🤓\n` +
        `💬 Quelle: **${message.channel.name}**\n` +
        `🔗 ${link}`
    });

    console.log("🧪 DEBUG: Hall message sent"); // temp log debugging 1

  } catch (err) {
    console.log("❌ HALL ERROR:", err);
  }
}

// =====================
// 📍 CATEGORY
// =====================
function getCategory(message) {
  if (message.channel.isThread?.()) {
    return message.channel.parent?.parent;
  }
  return message.channel.parent;
}

// =====================
// 🏆 /rank
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
// 🧠 /nerdstatus
// =====================
client.on(Events.InteractionCreate, async interaction => {

  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'nerdstatus') return;

  try {
    const member = await interaction.guild.members.fetch(interaction.user.id);

    let roleId = ROLE_INITIATE_NERD;

    if (member.roles.cache.has(ROLE_NERD_1337)) roleId = ROLE_NERD_1337;
    else if (member.roles.cache.has(ROLE_QUANTUM_NERD)) roleId = ROLE_QUANTUM_NERD;
    else if (member.roles.cache.has(ROLE_CORE_NERD)) roleId = ROLE_CORE_NERD;

    const msg = getRankMessage(roleId);

    await interaction.reply({
      content: `📊 Dein aktueller Nerd-Status:\n\n>>> ${msg}`,
      ephemeral: false
    });

  } catch (err) {
    console.log("❌ NERDSTATUS ERROR:", err);
  }
});

// =====================
// 🆕 /xp COMMAND
// =====================
client.on(Events.InteractionCreate, async interaction => {

  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'xp') return;

  try {
    const result = await db.query(
      `SELECT count FROM nerds WHERE userid = $1`,
      [interaction.user.id]
    );

    const xp = result.rows[0]?.count || 0;

    const role = getRoleByXP(xp);
    const next = getNextRoleInfo(xp);

    const barLength = 12;
    let progress = 0;

    if (next.next) {
      const prevThreshold =
        next.next === 1 ? 0 :
        next.next === 5 ? 1 :
        next.next === 20 ? 5 :
        next.next === 50 ? 20 : 50;

      progress = Math.min(xp - prevThreshold, next.next - prevThreshold);
    }

    const filled = Math.round((progress / (next.next ? (next.next - (next.next === 1 ? 0 : next.next === 5 ? 1 : next.next === 20 ? 5 : 20)) : 1)) * barLength);

    const bar = "█".repeat(Math.max(0, filled)) + "░".repeat(Math.max(0, barLength - filled));

    const embed = new EmbedBuilder()
      .setTitle("🤓 XP Status")
      .setColor(0x00AE86)
      .setDescription(
        `**XP:** ${xp}\n` +
        `**Aktuelle Rolle:** <@&${role}>\n` +
        `**Nächste Rolle:** ${next.role}\n\n` +
        `\`${bar}\``
      );

    await interaction.reply({ embeds: [embed] });

  } catch (err) {
    console.log("❌ XP ERROR:", err);
  }
});

// =====================
// 🔑 LOGIN
// =====================
client.login(process.env.TOKEN);