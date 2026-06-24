require('dotenv').config();

// =====================
// 📦 IMPORTS
// =====================
const { Client, GatewayIntentBits, Events, Partials, EmbedBuilder } = require('discord.js');
const { Pool } = require('pg');

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
// 🗄️ POSTGRES DATABASE (Supabase)
// =====================
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// =====================
// ⚙️ CONFIG (from .env)
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
});

// =====================
// 📍 HELPER: CATEGORY DETECTION
// =====================
function getCategory(message) {
  if (message.channel.isThread?.()) {
    return message.channel.parent?.parent;
  }
  return message.channel.parent;
}

// =====================
// 🤓 EVENT: REACTION ADDED
// =====================
client.on(Events.MessageReactionAdd, async (reaction, user) => {

  console.log("\n🤓 Reaction detected");

  if (user.bot) return;
  if (reaction.emoji.name !== '🤓') return;

  try {
    const message = await reaction.message.fetch({ force: true });

    const author = message.author;
    if (!author || author.bot) return;
    if (author.id === user.id) return;

    const category = getCategory(message);
    if (category?.id !== CODING_AREA_CATEGORY_ID) return;

    console.log("✅ Valid reaction for:", author.id);

    // 🔍 CHECK if reaction already counted
    const check = await db.query(
      `SELECT 1 FROM reactions WHERE messageId = $1 AND reactorId = $2`,
      [message.id, user.id]
    );

    if (check.rows.length > 0) return;

    // 💾 STORE reaction (anti-abuse protection)
    await db.query(
      `INSERT INTO reactions (messageId, reactorId)
       VALUES ($1, $2)`,
      [message.id, user.id]
    );

    // ➕ INCREASE nerd score
    await db.query(
      `INSERT INTO nerds (userId, count)
       VALUES ($1, 1)
       ON CONFLICT (userId)
       DO UPDATE SET count = nerds.count + 1`,
      [author.id]
    );

    // 📢 send hall-of-nerds message
    await sendHallMessage(author, message);

  } catch (err) {
    console.log("❌ ADD ERROR:", err);
  }
});

// =====================
// ➖ EVENT: REACTION REMOVED
// =====================
client.on(Events.MessageReactionRemove, async (reaction, user) => {

  console.log("\n➖ Reaction removed");

  if (user.bot) return;
  if (reaction.emoji.name !== '🤓') return;

  try {
    const message = await reaction.message.fetch({ force: true });

    const category = getCategory(message);
    if (category?.id !== CODING_AREA_CATEGORY_ID) return;

    const author = message.author;
    if (!author || author.bot) return;

    // 🔍 check if reaction exists in DB
    const check = await db.query(
      `SELECT 1 FROM reactions WHERE messageId = $1 AND reactorId = $2`,
      [message.id, user.id]
    );

    if (check.rows.length === 0) return;

    // ❌ remove reaction record
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

  } catch (err) {
    console.log("❌ REMOVE ERROR:", err);
  }
});

// =====================
// 📢 HALL OF NERDS MESSAGE
// =====================
async function sendHallMessage(author, message) {
  try {
    const channel = await client.channels.fetch(HALL_OF_NERDS_CHANNEL);
    if (!channel?.isTextBased()) return;

    const link = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;

    const title = message.channel.isThread()
      ? message.channel.name
      : message.channel.name;

    await channel.send({
      content:
        `🎉 <@${author.id}> hat sich ein Nerd verdient 🤓\n` +
        `💬 Quelle: **${title}**\n` +
        `🔗 ${link}`
    });

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

  console.log("⚡ /rank triggered");

  try {
    await interaction.deferReply();

    // 📊 fetch leaderboard
    const result = await db.query(
      `SELECT * FROM nerds ORDER BY count DESC LIMIT 10`
    );

    const rows = result.rows;

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

  } catch (err) {
    console.log("❌ RANK ERROR:", err);
  }
});

// =====================
// 🔑 LOGIN
// =====================
client.login(process.env.TOKEN);