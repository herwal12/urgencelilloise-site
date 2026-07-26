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
  TextInputStyle,
  StringSelectMenuBuilder
} = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Variables d'environnement & IDs
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const RECRUTEMENT_CHANNEL_ID = '1526171548472446986';
const CANDIDATURE_DEST_CHANNEL_ID = '1530409770539024465'; // Salon où arrivent les candidatures
const TICKET_CATEGORY_ID = '1525160491511713912'; 
const LOGO_URL = 'https://media.discordapp.net/attachments/1526171548472446986/1527347546618593441/logo-ul.png?ex=6a66323f&is=6a64e0bf&hm=bee565cff709ceecf1239dc8d86da488d8638079ff8c78876a556d077616996f&=&format=webp&quality=lossless';
const BANNER_URL = 'https://media.discordapp.net/attachments/1525200263173112018/1530635436660146317/image.png';

const WEBSITE_URL = 'https://urgencelilloise.onrender.com/recrutement';

// Initialisation du Bot Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.login(DISCORD_BOT_TOKEN).catch(err => {
  console.error("❌ Erreur de connexion au Bot Discord:", err);
});

client.once('ready', () => {
  console.log(`✅ Bot Discord connecté en tant que : ${client.user.tag}`);
});

// Fonction pour générer le panel de tickets
function getTicketPanelContent() {
  const ticketEmbed = new EmbedBuilder()
    .setColor('#e52d48')
    .setAuthor({ name: 'Urgence Lilloise — Support', iconURL: LOGO_URL })
    .setDescription(
      "Vous avez besoin d'aide ?\n" +
      "Notre équipe de staff est disponible pour vous accompagner.\n\n" +
      "**Sélectionnez une catégorie** dans le menu ci-dessous pour ouvrir votre ticket.\n\n" +
      "🟡 **Question** — Une question générale sur le serveur\n" +
      "🛒 **Boutique** — Achat, paiement, commande boutique\n" +
      "🐛 **Bug IG** — Signaler un bug en jeu\n" +
      "⚖️ **Légal** — Reprise d'entreprise légale\n" +
      "💵 **Illégal** — Reprise de groupe illégal\n" +
      "🔴 **Unban** — Demande de débannissement\n" +
      "🟢 **Recrutement Staff** — Rejoindre l'équipe staff\n" +
      "🔵 **Recrutement Animateur** — Rejoindre l'équipe animation\n" +
      "🇨🇵 **Plainte Staff** — Signaler un membre du staff"
    )
    .addFields({
      name: "⚠️ Avant d'ouvrir un ticket",
      value: "Assurez-vous de ne pas avoir de ticket déjà ouvert.\n" +
             "Préparez toutes les informations nécessaires (preuves, ID, captures d'écran).\n" +
             "Restez respectueux envers le staff."
    })
    .setImage(BANNER_URL)
    .setFooter({ text: 'Urgence Lilloise — Tous droits réservés' });

  const ticketRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('create_ticket_menu')
      .setPlaceholder('Choisissez une raison pour ouvrir un ticket...')
      .addOptions([
        { label: 'Question', description: 'Question générale sur le serveur', value: 'ticket_question', emoji: '🟡' },
        { label: 'Boutique', description: 'Achat, paiement, commande boutique', value: 'ticket_boutique', emoji: '🛒' },
        { label: 'Bug IG', description: 'Signaler un bug en jeu', value: 'ticket_bug', emoji: '🐛' },
        { label: 'Légal', description: "Reprise d'entreprise légale", value: 'ticket_legal', emoji: '⚖️' },
        { label: 'Illégal', description: 'Reprise de groupe illégal', value: 'ticket_illegal', emoji: '💵' },
        { label: 'Unban', description: 'Demande de débannissement', value: 'ticket_unban', emoji: '🔴' },
        { label: 'Recrutement Staff', description: "Rejoindre l'équipe staff", value: 'ticket_recrutement_staff', emoji: '🟢' },
        { label: 'Recrutement Animateur', description: "Rejoindre l'équipe animation", value: 'ticket_recrutement_anim', emoji: '🔵' },
        { label: 'Plainte Staff', description: 'Signaler un membre du staff', value: 'ticket_plainte_staff', emoji: '🇨🇵' }
      ])
  );

  return { embeds: [ticketEmbed], components: [ticketRow] };
}

// Gestion des commandes par message
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim().toLowerCase();

  if (content === '!panel') {
    try {
      await message.delete().catch(() => {});
      const panelData = getTicketPanelContent();
      await message.channel.send(panelData);
    } catch (e) {
      console.error("❌ Erreur lors de l'envoi du panel :", e);
    }
  }

  if (content === '!panel-recrutement') {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply('❌ Tu n\'as pas la permission d\'utiliser cette commande.');
    }

    try {
      await message.delete().catch(() => {});

      const embed = new EmbedBuilder()
        .setColor('#e52d48')
        .setTitle('URGENCE LILLOISE • RECRUTEMENTS')
        .setDescription("Envie de rejoindre l'équipe ?\n\nLes recrutements se font directement sur notre site internet officiel.\nClique sur le bouton ci-dessous pour accéder à la plateforme de candidature !")
        .setThumbnail(LOGO_URL)
        .setFooter({ text: 'Urgence Lilloise • Équipe de recrutement' });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Accéder aux recrutements')
            .setStyle(ButtonStyle.Link)
            .setURL(WEBSITE_URL)
            .setEmoji('🌐')
        );

      const channel = client.channels.cache.get(RECRUTEMENT_CHANNEL_ID);
      if (channel) {
        await channel.send({ embeds: [embed], components: [row] });
      }
    } catch (e) {
      console.error("❌ Erreur lors de l'envoi du panel recrutement :", e);
    }
  }
});

// Configuration EJS & Middlewares Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Limitation anti-spam assouplie (50 requêtes)
const applyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, 
  message: { error: "Trop de tentatives. Réessayez plus tard." }
});

// Routes Web
app.get('/', (req, res) => res.render('index'));
app.get('/recrutement', (req, res) => res.render('recrutement'));
app.get('/boutique', (req, res) => res.render('boutique'));
app.get('/reglement', (req, res) => res.render('reglement'));

// ROUTE DE RÉCEPTION DU FORMULAIRE DE RECRUTEMENT
app.post('/recrutement', applyLimiter, async (req, res) => {
  try {
    // Récupération des données envoyées depuis le formulaire web
    // (adapte les noms des variables si tes champs dans ton formulaire HTML ont des attributs 'name' différents)
    const { 
      discordPseudo, 
      discordId, 
      prenom, 
      age, 
      ambition, 
      motivation1, 
      motivation2, 
      motivation3 
    } = req.body;

    // Récupération du salon Discord où envoyer la candidature
    const targetChannel = client.channels.cache.get(CANDIDATURE_DEST_CHANNEL_ID);
    
    if (targetChannel) {
      const candidatureEmbed = new EmbedBuilder()
        .setColor('#e52d48')
        .setTitle('📥 Nouvelle candidature reçue')
        .setThumbnail(LOGO_URL)
        .addFields(
          { name: '👤 Discord', value: `Pseudo : \`${discordPseudo || 'Non renseigné'}\`\nID : \`${discordId || 'Non renseigné'}\``, inline: false },
          { name: '📋 Informations IRL', value: `Prénom : \`${prenom || 'Non renseigné'}\`\nÂge : \`${age || 'Non renseigné'} ans\``, inline: false },
          { name: '🎯 Ambition / Motivation', value: ambition || motivation1 || 'Aucune réponse fournie', inline: false },
          { name: '💡 Expériences / Rôle', value: motivation2 || 'Aucune réponse fournie', inline: false },
          { name: '💬 Vision du rôle', value: motivation3 || 'Aucune réponse fournie', inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Urgence Lilloise • Système de Recrutement' });

      // Boutons Accepter / Refuser sous la candidature
      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`accept_${discordId || 'unknown'}`)
          .setLabel('Accepter')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId(`refuse_${discordId || 'unknown'}`)
          .setLabel('Refuser')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌')
      );

      await targetChannel.send({ embeds: [candidatureEmbed], components: [actionRow] });
    }

    return res.status(200).json({ success: true, message: "Candidature envoyée avec succès !" });
  } catch (err) {
    console.error("Erreur lors de l'envoi de la candidature sur Discord :", err);
    return res.status(500).json({ error: "Erreur serveur lors de l'envoi." });
  }
});

// Gestion des Interactions Discord (Tickets & Boutons de Candidature)
client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'create_ticket_menu') {
        const selectedValue = interaction.values[0];
        const guild = interaction.guild;
        const member = interaction.member;

        const ticketChannel = await guild.channels.create({
          name: `ticket-${member.user.username}`,
          type: 0, 
          parent: TICKET_CATEGORY_ID,
          permissionOverwrites: [
            { id: guild.id, deny: ['ViewChannel'] },
            { id: member.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
          ],
        });

        await interaction.reply({ 
          content: `✅ Ton ticket a été créé avec succès : ${ticketChannel}`, 
          ephemeral: true 
        });

        const welcomeEmbed = new EmbedBuilder()
          .setColor('#e52d48')
          .setTitle('Ticket — ' + member.user.username)
          .setDescription(`Bienvenue ${member}, un membre du staff va s'occuper de toi.\n\n📌 **Raison :** ${selectedValue}`)
          .setTimestamp();

        const closeButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Fermer le ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
        );

        await ticketChannel.send({ content: `${member}`, embeds: [welcomeEmbed], components: [closeButton] });
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'close_ticket') {
        await interaction.reply({ content: '🔒 Fermeture du ticket en cours...' });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
        return;
      }
    }
  } catch (error) {
    console.error("Erreur lors du traitement de l'interaction :", error);
  }
});

app.listen(PORT, () => {
  console.log(`Serveur Web démarré sur le port ${PORT}`);
});
