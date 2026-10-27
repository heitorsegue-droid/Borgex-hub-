require("dotenv").config();
const {
  Client, GatewayIntentBits, REST, Routes,
  SlashCommandBuilder, EmbedBuilder, PermissionsBitField
} = require("discord.js");

for (const key of ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID"]) {
  if (!process.env[key]) {
    console.error(`Missing ${key}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

const rarities = new Set(["divine", "eternal", "secret"]);
const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Verifica se o Borgex Egg Notifier está online."),
  new SlashCommandBuilder().setName("alerta-teste").setDescription("Envia um exemplo de alerta, identificado como teste."),
  new SlashCommandBuilder().setName("formato").setDescription("Mostra os dados que o bot pode publicar.")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const seen = new Set();

function elapsedLabel(timestamp) {
  if (!timestamp) return "Não informado";
  const ms = Date.parse(timestamp);
  if (!Number.isFinite(ms)) return "Horário inválido";
  const seconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (seconds < 60) return `há ${seconds} segundo(s)`;
  if (seconds < 3600) return `há ${Math.floor(seconds / 60)} minuto(s)`;
  return `há ${Math.floor(seconds / 3600)} hora(s)`;
}

function makeEmbed(item, isTest = false) {
  const rarity = String(item.rarity || "Raridade desconhecida");
  const emoji = { divine: "💎", eternal: "👑", secret: "🔥" }[rarity.toLowerCase()] || "🥚";
  const embed = new EmbedBuilder()
    .setTitle(`${emoji} ${rarity.toUpperCase()} ${isTest ? "— TESTE" : "— PET DETECTADO"}`)
    .setColor(rarity.toLowerCase() === "divine" ? 0x9b59b6 : rarity.toLowerCase() === "eternal" ? 0xf1c40f : 0xe74c3c)
    .addFields(
      { name: "🐾 Nome do pet", value: String(item.pet || "Não informado"), inline: false },
      { name: "📍 Local do spawn", value: String(item.location || "Não informado"), inline: true },
      { name: "💰 Renda por segundo", value: String(item.incomePerSecond || "Não informado"), inline: true },
      { name: "🕒 Horário do spawn", value: item.spawnedAt ? `<t:${Math.floor(Date.parse(item.spawnedAt) / 1000)}:F>` : "Não informado", inline: false },
      { name: "⏱️ Tempo desde o spawn", value: elapsedLabel(item.spawnedAt), inline: true }
    )
    .setFooter({ text: isTest ? "Alerta demonstrativo — não é um spawn real." : "Borgex Egg Notifier • dados conforme a fonte conectada" })
    .setTimestamp(new Date());
  return embed;
}

async function sendAlert(channel, item, isTest = false) {
  await channel.send({ embeds: [makeEmbed(item, isTest)] });
}

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "ping") {
    return interaction.reply({ content: "🥚 Borgex Egg Notifier está online.", ephemeral: true });
  }
  if (interaction.commandName === "formato") {
    return interaction.reply({
      content: "O alerta contém: nome do pet, raridade, local do spawn, renda por segundo, horário e tempo decorrido. Dados reais dependem da fonte conectada.",
      ephemeral: true
    });
  }
  if (interaction.commandName === "alerta-teste") {
    const sample = {
      rarity: "Divine",
      pet: "Pet de demonstração",
      location: "Bioma de exemplo",
      incomePerSecond: "Valor demonstrativo",
      spawnedAt: new Date().toISOString()
    };
    await interaction.reply({ content: "Enviando um exemplo marcado como TESTE neste canal.", ephemeral: true });
    return sendAlert(interaction.channel, sample, true);
  }
});

async function pollFeed() {
  const url = process.env.FEED_URL;
  const channelId = process.env.CHANNEL_ID;
  if (!url || !channelId) return;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Feed returned HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Feed must return a JSON array");
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) throw new Error("CHANNEL_ID is not a text channel");

    for (const item of data) {
      if (!rarities.has(String(item.rarity || "").toLowerCase()) || !item.pet) continue;
      const eventId = item.id || `${item.rarity}|${item.pet}|${item.location}|${item.spawnedAt}`;
      if (seen.has(eventId)) continue;
      seen.add(eventId);
      await sendAlert(channel, item, false);
    }
    if (seen.size > 5000) seen.clear();
  } catch (err) {
    console.error("Feed error:", err.message);
  }
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await pollFeed();
  setInterval(pollFeed, Math.max(15, Number(process.env.POLL_SECONDS || 30)) * 1000);
});

register();
async function register() {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
    await client.login(process.env.DISCORD_TOKEN);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
