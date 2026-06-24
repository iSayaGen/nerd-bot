require('dotenv').config();

// =====================
// 📦 IMPORTS
// =====================
const { Client, GatewayIntentBits, Events, Partials, EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

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
// 🗄️ DATABASE (SQLite)
// Stores:
// - nerd points
// - reaction tracking (prevents duplicates)
// =====================
const db = new sqlite3.Database('./nerds.db');

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
// Checks whether message is inside:
// - normal channel OR
// - thread inside a channel
// =====================
function getCategory(message) {
  if (message.channel.isThread?.()) {
    return message.channel.parent?.parent;
  }
  return message.channel.parent;
}

// =====================
// 🤓 EVENT: REACTION ADDED
// Adds a nerd point when valid reaction is detected
// =====================
client.on(Events.MessageReactionAdd, async (reaction, user) => {

  console.log("\n🤓 Reaction detected");

  // ❌ ignore bots
  if (user.bot) return;

  // ❌ only nerd emoji counts
  if (reaction.emoji.name !== '🤓') return;

  try {
    // 📩 fetch full message data
    const message = await reaction.message.fetch({ force: true });

    const author = message.author;

    // ❌ invalid message or bot message
    if (!author || author.bot) return;

    // ❌ no self-points allowed
    if (author.id === user.id) return;

    // 📍 check if inside allowed category
    const category = getCategory(message);
    if (category?.id !== CODING_AREA_CATEGORY_ID) return;

    console.log("✅ Valid reaction for:", author.id);

    // 🔍 check if already counted
    db.get(
      `SELECT 1 FROM reactions WHERE messageId = ? AND reactorId = ?`,
      [message.id, user.id],
      async (err, row) => {

        if (err) return;
        if (row) return;

        // 💾 store reaction (prevents duplicates)
        db.run(
          `INSERT INTO reactions (messageId, reactorId) VALUES (?, ?)`,
          [message.id, user.id]
        );

        // ➕ increase nerd score
        db.run(`
          INSERT INTO nerds (userId, count)
          VALUES (?, 1)
          ON CONFLICT(userId)
          DO UPDATE SET count = count + 1
        `, [author.id]);

        // 📢 send hall-of-nerds message
        await sendHallMessage(author, message);
      }
    );

  } catch (err) {
    console.log("❌ ADD ERROR:", err);
  }
});

// =====================
// ➖ EVENT: REACTION REMOVED
// Removes nerd point if reaction is removed
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

    db.get(
      `SELECT 1 FROM reactions WHERE messageId = ? AND reactorId = ?`,
      [message.id, user.id],
      (err, row) => {

        if (err || !row) return;

        // ❌ remove reaction record
        db.run(
          `DELETE FROM reactions WHERE messageId = ? AND reactorId = ?`,
          [message.id, user.id]
        );

        // ➖ decrease nerd score safely
        db.run(`
          UPDATE nerds
          SET count = CASE WHEN count > 0 THEN count - 1 ELSE 0 END
          WHERE userId = ?
        `, [author.id]);
      }
    );

  } catch (err) {
    console.log("❌ REMOVE ERROR:", err);
  }
});

// =====================
// 📢 HALL OF NERDS MESSAGE
// Sends notification when someone earns a point
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
// Shows top 10 users
// =====================
function getTopNerds() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM nerds ORDER BY count DESC LIMIT 10`,
      [],
      (err, rows) => err ? reject(err) : resolve(rows)
    );
  });
}

client.on(Events.InteractionCreate, async interaction => {

  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'rank') return;

  console.log("⚡ /rank triggered");

  try {
    await interaction.deferReply();

    const rows = await getTopNerds();

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