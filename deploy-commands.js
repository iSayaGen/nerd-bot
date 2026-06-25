require('dotenv').config();

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const commands = [
  new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Zeigt das Nerd Ranking'),

  new SlashCommandBuilder()
    .setName('nerdstatus')
    .setDescription('Zeigt deinen aktuellen Nerd Status'),

  new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Zeigt deinen XP Fortschritt')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log("🧹 Clearing GLOBAL commands...");
    
    // STEP 1 → CLEAR OLD GLOBAL COMMANDS
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: [] }
    );

    console.log("🚀 Registering GUILD commands...");

    // STEP 2 → REGISTER NEW GUILD COMMAND
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("✅ DONE");
  } catch (error) {
    console.error(error);
  }
})();