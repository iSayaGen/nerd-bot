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
  ssl: { rejectUnauthorized: false }
});

// =====================
// ⚙️ CONFIG
// =====================
const CODING_AREA_CATEGORY_ID = process.env.CODING_AREA_CATEGORY_ID;
const HALL_OF_NERDS_CHANNEL = process.env.HALL_OF_NERDS_CHANNEL;

// =====================
// 🚀 BOT READY EVENT
// =====================
client.once(Events.ClientReady, () => {
  console.log("====================================");
  console.log("🤖 BOT READY:", client.user.tag);
  console.log("====================================");
  console.log("🧪 DEBUG: Bot ready event fired"); // temp log debugging 1
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
    console.log("🧪 DEBUG: Checking duplicate reaction"); // temp log debugging 1

    const check = await db.query(
      `SELECT 1 FROM reactions WHERE messageId = $1 AND reactorId = $2`,
      [message.id, user.id]
    );

    if (check.rows.length > 0) {
      console.log("🧪 DEBUG: Duplicate reaction blocked"); // temp log debugging 1
      return;
    }

    console.log("🧪 DEBUG: No duplicate found"); // temp log debugging 1

    // 💾 store reaction
    console.log("💾 trying DB update for:", author.id);

    console.log("🧪 DEBUG: Inserting reaction into DB"); // temp log debugging 1

    await db.query(
      `INSERT INTO reactions (messageId, reactorId) VALUES ($1, $2)`,
      [message.id, user.id]
    );

    // ➕ increase nerd score
    console.log("🧪 DEBUG: Updating nerd score for:", author.id); // temp log debugging 1

    await db.query(
      `INSERT INTO nerds (userId, count)
       VALUES ($1, 1)
       ON CONFLICT (userId)
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
    console.log("🧪 DEBUG: Checking reaction exists"); // temp log debugging 1

    const check = await db.query(
      `SELECT 1 FROM reactions WHERE messageId = $1 AND reactorId = $2`,
      [message.id, user.id]
    );

    if (check.rows.length === 0) return;

    console.log("🧪 DEBUG: Reaction exists -> removing"); // temp log debugging 1

    // ❌ delete reaction record
    await db.query(
      `DELETE FROM reactions WHERE messageId = $1 AND reactorId = $2`,
      [message.id, user.id]
    );

    // ➖ decrease nerd score safely
    await db.query(
      `UPDATE nerds
       SET count = CASE WHEN count > 0 THEN count - 1 ELSE 0 END
       WHERE userId = $1`,
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
        const member = await interaction.guild.members.fetch(rows[i].userId);

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
// 🔑 LOGIN
// =====================
client.login(process.env.TOKEN);