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
const RECRUTEMENT_CHANNEL_ID = '1526171548472446986';
const LOGO_URL = 'https://media.discordapp.net/attachments/1526171548472446986/1527347546618593441/logo-ul.png?ex=6a66323f&is=6a64e0bf&hm=bee565cff709ceecf1239dc8d86da488d8638079ff8c78876a556d077616996f&=&format=webp&quality=lossless';

// Initialisation du Bot Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Connexion du Bot
client.login(DISCORD_BOT_TOKEN).catch(err => {
  console.error("❌ Erreur de connexion au Bot Discord:", err);
});

client.once('ready', () => {
  console.log(`✅ Bot Discord connecté en tant que : ${client.user.tag}`);
});

// Commande pour envoyer le panel de recrutement dans le salon dédié
client.on('messageCreate', async (message) => {
  if (message.author.bot || message.content !== '!panel') return;

  const embed = new EmbedBuilder()
    .setColor('#e52d48')
    .setTitle('URGENCE LILLOISE • RECRUTEMENTS')
    .setDescription("Les recrutements sont actuellement **ouverts**.\n\nClique sur le bouton ci-dessous pour accéder au site et postuler directement !")
    .setThumbnail(LOGO_URL)
    .setFooter({ text: 'Urgence Lilloise • Équipe de recrutement' });

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('Accéder au site / Postuler')
        .setStyle(ButtonStyle.Link)
        .setURL('http://localhost:3000/recrutement') // Remplace par ton URL finale une fois en ligne
        .setEmoji('🔗')
    );

  const channel = client.channels.cache.get(RECRUTEMENT_CHANNEL_ID);
  if (channel) {
    await channel.send({ embeds: [embed], components: [row] });
    message.reply('✅ Panel de recrutement envoyé avec succès !');
  } else {
    message.reply('❌ Erreur : Impossible de trouver le salon de recrutement.');
  }
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

    // Vérification si le service demandé est Community Manager
    const isCM = service && service.toLowerCase().includes('community');

    // Création de l'Embed
    const embed = new EmbedBuilder()
      .setTitle(`DOSSIER DE CANDIDATURE — ${(service || 'GÉNÉRAL').toUpperCase()}`)
      .setColor(isCM ? 0xE52D48 : 0x1E222B)
      .setThumbnail(LOGO_URL)
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

    if (isCM) {
      embed.addFields({ name: "Statut du Dossier", value: "❌ **CANDIDATURE FERMÉE** (Poste indisponible)", inline: false });
    }

    // Création des Boutons (Désactivés si c'est CM)
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept_${discordId}`)
        .setLabel('Accepter')
        .setStyle(ButtonStyle.Success)
        .setDisabled(isCM),
      new ButtonBuilder()
        .setCustomId(`refuse_${discordId}`)
        .setLabel('Refuser')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(isCM)
    );

    await channel.send({ embeds: [embed], components: [buttons] });
    
    if (isCM) {
      return res.status(400).json({ error: "Les recrutements pour le poste de Community Manager sont actuellement fermés." });
    }

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
          .setThumbnail("https://cdn.discordapp.com/avatars/1530428064973066421/28fd2ee654c604eadbad7d53eaf14cdf.webp")
          .setFooter({ text: "ymn_0ffcl | Tous droits réservés" });

        await targetUser.send({ embeds: [acceptEmbed] }).catch(() => console.log("Impossible d'envoyer un MP."));

        originalEmbed.setColor(0x2ED573);
        originalEmbed.addFields({ name: "Statut du Dossier", value: `✅ **ACCEPTÉ** par ${staffUser.tag}`, inline: false });

        await interaction.editReply({ embeds: [originalEmbed], components: [] });

      } else if (action === 'refuse') {
        const modal = new ModalBuilder()
          .setCustomId(`modal_refuse_${targetUserId}`)
          .setTitle('Motif du refus de la candidature');

        const reasonInput = new TextInputBuilder()
          .setCustomId('refuse_reason')
          .setLabel('Raison du refus :')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Ex: Réponse trop courte, candidature nulle...')
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(modal);
      }
    }

    // 2. Si c'est la soumission de la modale de refus
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('modal_refuse_')) {
        const targetUserId = interaction.customId.replace('modal_refuse_', '');
        const reason = interaction.fields.getTextInputValue('refuse_reason');

        await interaction.deferUpdate();

        const staffUser = interaction.user;
        const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
        const targetUser = await client.users.fetch(targetUserId);

        const refuseEmbed = new EmbedBuilder()
          .setTitle("🪪 Recrutement")
          .setDescription(`Votre demande de recrutement vient d'être revue.\n\n🌐 **Statut de la réponse**\n> **Refusée.**\n\n❌ Bonjour. Nous vous informons que votre candidature pour le staff d'**Urgence Lilloise** n'a malheureusement **pas été retenue**.\n\n📌 **Raison du refus :**\n> *${reason}*\n\nMerci pour l'intérêt que vous portez à notre serveur.`)
          .setColor(0xE52D48)
          .setThumbnail("https://cdn.discordapp.com/avatars/1530428064973066421/28fd2ee654c604eadbad7d53eaf14cdf.webp")
          .setFooter({ text: "ymn_0ffcl | Tous droits réservés" });

        await targetUser.send({ embeds: [refuseEmbed] }).catch(() => console.log("Impossible d'envoyer un MP."));

        originalEmbed.setColor(0xE52D48);
        originalEmbed.addFields(
          { name: "Statut du Dossier", value: `❌ **REFUSÉ** par ${staffUser.tag}`, inline: false },
          { name: "Raison du Refus", value: `\`\`\`\n${reason}\n\`\`\``, inline: false }
        );

        await interaction.editReply({ embeds: [originalEmbed], components: [] });
      }
    }

  } catch (error) {
    console.error("Erreur lors du traitement de l'interaction :", error);
  }
});

app.listen(PORT, () => {
  console.log(`Serveur Web démarré sur le port ${PORT}`);
});
