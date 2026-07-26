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
const TICKET_CATEGORY_ID = '1525160491511713912'; // ID de la catégorie où les salons de tickets vont se créer
const LOGO_URL = 'https://media.discordapp.net/attachments/1526171548472446986/1527347546618593441/logo-ul.png?ex=6a66323f&is=6a64e0bf&hm=bee565cff709ceecf1239dc8d86da488d8638079ff8c78876a556d077616996f&=&format=webp&quality=lossless';
const BANNER_URL = 'https://media.discordapp.net/attachments/1525200263173112018/1530635436660146317/image.png';

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

// Fonction pour générer le contenu du panel de tickets
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

  // 1. Commande !panel pour envoyer le panneau de tickets
  if (content === '!panel') {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply('❌ Tu n\'as pas la permission d\'utiliser cette commande.');
    }

    try {
      await message.delete().catch(() => {});
      const panelData = getTicketPanelContent();
      await message.channel.send(panelData);
      console.log("✅ Panel de tickets envoyé avec succès via !panel !");
    } catch (e) {
      console.error("❌ Erreur lors de l'envoi du panel :", e);
    }
  }

  // 2. Commande !panel-recrutement (ou autre si besoin)
  if (content === '!panel-recrutement') {
    const embed = new EmbedBuilder()
      .setColor('#e52d48')
      .setTitle('URGENCE LILLOISE • RECRUTEMENTS')
      .setDescription("Recrutements fermés\n\nLes recrutements sont actuellement **fermés**.\n\nAucune nouvelle candidature ne peut être envoyée pour le moment.")
      .setThumbnail(LOGO_URL)
      .setFooter({ text: 'Urgence Lilloise • Équipe de recrutement' });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('recrutements_fermes')
          .setLabel('Recrutements fermés')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

    const channel = client.channels.cache.get(RECRUTEMENT_CHANNEL_ID);
    if (channel) {
      await channel.send({ embeds: [embed], components: [row] });
      message.reply('✅ Panel de recrutement fermé envoyé avec succès !');
    }
  }
});

// Configuration EJS & Middlewares Express
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

// Routes Web
app.get('/', (req, res) => res.render('index'));
app.get('/recrutement', (req, res) => res.render('recrutement'));
app.get('/boutique', (req, res) => res.render('boutique'));
app.get('/reglement', (req, res) => res.render('reglement'));

app.post('/recrutement', applyLimiter, async (req, res) => {
  return res.status(403).json({ error: "Les recrutements sont actuellement fermés. Aucune candidature n'est acceptée." });
});

// Gestion des Interactions (Boutons, Menus Déroulants et Modals)
client.on('interactionCreate', async (interaction) => {
  try {
    // Sélection dans le menu -> Création du salon de ticket dans la catégorie
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
            {
              id: guild.id,
              deny: ['ViewChannel'],
            },
            {
              id: member.id,
              allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
            },
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

    // Gestion des boutons (fermeture de ticket / acceptation de recrutement)
    if (interaction.isButton()) {
      if (interaction.customId === 'close_ticket') {
        await interaction.reply({ content: '🔒 Fermeture du ticket en cours...' });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
        return;
      }

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

        await targetUser.send({ embeds: [acceptEmbed] }).catch(() => {});

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

    // Modale de refus
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

        await targetUser.send({ embeds: [refuseEmbed] }).catch(() => {});

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
