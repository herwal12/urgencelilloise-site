const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Variables d'environnement
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const RECRUTEMENT_CHANNEL_ID = process.env.RECRUTEMENT_CHANNEL_ID;

// Initialisation du Bot Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

// Connexion du Bot
client.login(DISCORD_BOT_TOKEN).catch(err => {
  console.error("❌ Erreur de connexion au Bot Discord:", err);
});

client.once('ready', () => {
  console.log(`✅ Bot Discord connecté en tant que : ${client.user.tag}`);
});

// Configuration EJS & Middlewares
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const applyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Trop de tentatives. Réessayez plus tard." }
});

// Routes
app.get('/', (req, res) => res.render('index'));
app.get('/recrutement', (req, res) => res.render('recrutement'));
app.get('/boutique', (req, res) => res.render('boutique'));

// Traitement du formulaire de recrutement
app.post('/recrutement', applyLimiter, async (req, res) => {
  const { service, discordTag, discordId, prenom, age, ambition, motivation, experience, roleModerateur } = req.body;

  if (!discordTag || !discordId || !prenom || !age || !motivation) {
    return res.status(400).json({ error: "Veuillez remplir tous les champs obligatoires." });
  }

  try {
    const channel = await client.channels.fetch(RECRUTEMENT_CHANNEL_ID);
    if (!channel) {
      return res.status(500).json({ error: "Salon Discord introuvable." });
    }

    // Création de l'Embed
    const embed = new EmbedBuilder()
      .setTitle(`DOSSIER DE CANDIDATURE — ${(service || 'GÉNÉRAL').toUpperCase()}`)
      .setColor(0x1E222B)
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: "Identification Discord", value: `• **Compte :** \`${discordTag}\`\n• **ID :** \`${discordId}\``, inline: true },
        { name: "Informations IRL", value: `• **Prénom :** ${prenom}\n• **Âge :** ${age} ans`, inline: true },
        { name: "\u200B", value: "\u200B", inline: false },
        { name: "Ambitions", value: `\`\`\`\n${ambition || 'Non renseignée'}\n\`\`\``, inline: false },
        { name: "Motivations", value: `\`\`\`\n${motivation}\n\`\`\``, inline: false },
        { name: "Expériences Passées", value: `\`\`\`\n${experience || 'Aucune expérience mentionnée.'}\n\`\`\``, inline: false },
        { name: "Vision du poste de Modérateur", value: `\`\`\`\n${roleModerateur || 'Non renseigné'}\n\`\`\``, inline: false }
      )
      .setFooter({ text: "Urgence Lilloise — Système de Recrutement • Made by ymn_0ffcl" })
      .setTimestamp();

    // Création des Boutons
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept_${discordId}`)
        .setLabel('Accepter')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`refuse_${discordId}`)
        .setLabel('Refuser')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [buttons] });
    return res.json({ success: true, message: "Candidature envoyée avec succès !" });

  } catch (err) {
    console.error("Erreur lors de l'envoi de la candidature :", err);
    return res.status(500).json({ error: "Erreur lors de la communication avec le serveur Discord." });
  }
});

// Gestion des Interactions (Boutons et Modals)
client.on('interactionCreate', async (interaction) => {
  try {
    // 1. Si c'est un clic sur un bouton
    if (interaction.isButton()) {
      const [action, targetUserId] = interaction.customId.split('_');
      
      if (action === 'accept') {
        await interaction.deferUpdate();
        const staffUser = interaction.user;
        const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
        const targetUser = await client.users.fetch(targetUserId);

        const acceptEmbed = new EmbedBuilder()
          .setTitle("🪪 Recrutement")
          .setDescription("Votre demande de recrutement vient d'être revue.\n\n🌐 **Statut de la réponse**\n> **Acceptée.**\n\n🎉 Félicitation ! Votre candidature visant la modération de notre serveur a été acceptée !\nIl vous est donc demandé d'ouvrir un ticket sur le Discord principal, dans la catégorie Direction, afin de poursuivre les formalités. Merci de ne faire aucune mention (@) dans votre ticket.")
          .setColor(0x2ED573)
          .setThumbnail("[https://cdn.discordapp.com/avatars/1530428064973066421/28fd2ee654c604eadbad7d53eaf1](https://cdn.discordapp.com/avatars/1530428064973066421/28fd2ee654c604eadbad7d53eaf1)
