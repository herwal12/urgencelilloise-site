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
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
  PermissionsBitField,
  AttachmentBuilder
} = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Variables d'environnement & IDs
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const RECRUTEMENT_CHANNEL_ID = '1530783982877278213'; // Salon pour envoyer le panel !panel
const CANDIDATURE_DEST_CHANNEL_ID = '1530783985045606508'; // Salon où arrivent les candidatures du site
const TICKET_CHANNEL_ID = '1530783984143962204'; // Salon pour envoyer le panel de tickets !ticket
const TICKET_LOGS_CHANNEL_ID = '1531727851680698379'; // Salon où envoyer les logs et transcripts des tickets fermés
const LOGO_URL = 'https://media.discordapp.net/attachments/1526171548472446986/1527347546618593441/logo-ul.png?ex=6a68d53f&is=6a6783bf&hm=41577189ad8d5c5fe693891bccd581b7b7623419699f2bfadf1822c1bec7443b&=&format=webp&quality=lossless';
const TICKET_BANNER_URL = 'https://media.discordapp.net/attachments/1530783984143962204/1532199713468841994/image.png?ex=6a6bfbae&is=6a6aaa2e&hm=f647b951b1389272d866ec5381b8fb42be9c70468ad5b1dc1e20f9eac077a586&=&format=webp&quality=lossless';
const SERVER_ICON_URL = 'https://images-ext-1.discordapp.net/external/13dVJvwLxmIyN952nvst_nHPVhRaOG98o5eg0L09rUw/%3Fsize%3D256/https/cdn.discordapp.com/icons/1530783981988085853/01bad94e7ccac907a3d138d7575b101a.png?format=webp&quality=lossless';

// Correspondance des catégories de tickets avec leurs IDs de catégorie Discord
const TICKET_CATEGORIES = {
  'ticket_question': { name: 'question', categoryId: '1530783985221898419', title: 'Question' },
  'ticket_boutique': { name: 'boutique', categoryId: '1531718799542452484', title: 'Boutique' },
  'ticket_bug': { name: 'bug-ig', categoryId: '1531719099829325925', title: 'Bug IG' },
  'ticket_legal': { name: 'legal', categoryId: '1531718799542452484', title: 'Légal' },
  'ticket_illegal': { name: 'illegal', categoryId: '1531718799542452484', title: 'Illégal' },
  'ticket_unban': { name: 'unban', categoryId: '1531717701125410906', title: 'Unban' },
  'ticket_plainte': { name: 'plainte-staff', categoryId: '1531724039729713223', title: 'Plainte Staff' }
};

// Stockage temporaire pour retrouver le créateur du ticket (userId) et l'heure de création
const activeTickets = new Map();

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

// Commandes textuelles et de gestion des tickets
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Gestion des commandes de modération de ticket (.rename, .add, .del) dans les salons gérés
  if (activeTickets.has(message.channel.id)) {
    const args = message.content.trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 1. Commande .rename <nouveau-nom>
    if (command === '.rename') {
      const newName = args.join('-');
      if (!newName) {
        return message.reply({ content: '❌ Utilisation : `.rename <nouveau-nom>`' });
      }
      try {
        await message.channel.setName(newName);
        return message.reply({ content: `✅ Salon renommé en **${newName}** avec succès.` });
      } catch (err) {
        return message.reply({ content: '❌ Erreur lors du renommage du salon (vérifie les permissions du bot).' });
      }
    }

    // 2. Commande .add @membre
    if (command === '.add') {
      const targetMember = message.mentions.members.first();
      if (!targetMember) {
        return message.reply({ content: '❌ Utilisation : `.add @membre`' });
      }
      try {
        await message.channel.permissionOverwrites.edit(targetMember.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
        return message.reply({ content: `✅ ${targetMember} a été ajouté au ticket.` });
      } catch (err) {
        return message.reply({ content: '❌ Erreur lors de l\'ajout du membre.' });
      }
    }

    // 3. Commande .del @membre
    if (command === '.del') {
      const targetMember = message.mentions.members.first();
      if (!targetMember) {
        return message.reply({ content: '❌ Utilisation : `.del @membre`' });
      }
      try {
        await message.channel.permissionOverwrites.edit(targetMember.id, {
          ViewChannel: false,
          SendMessages: false,
          ReadMessageHistory: false
        });
        return message.reply({ content: `✅ L'accès au ticket a été retiré à ${targetMember}.` });
      } catch (err) {
        return message.reply({ content: '❌ Erreur lors du retrait du membre.' });
      }
    }
  }

  if (message.content === '!panel') {
    const embed = new EmbedBuilder()
      .setColor('#e52d48')
      .setTitle('URGENCE LILLOISE • RECRUTEMENTS')
      .setDescription("Comme annoncé, les recrutements sont dorénavant **fermés**. Par conséquent, il vous est actuellement **impossible de postuler**.\n\nMerci de votre compréhension et de l'intérêt que vous portez à notre communauté.")
      .setThumbnail(LOGO_URL)
      .setFooter({ text: 'Urgence Lilloise • Équipe de recrutement' })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('recrutement_ferme')
          .setLabel('Recrutements fermés ❌')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true)
      );

    const channel = client.channels.cache.get(RECRUTEMENT_CHANNEL_ID);
    if (channel) {
      await channel.send({ embeds: [embed], components: [row] });
      message.reply('✅ Panel de recrutement envoyé avec succès !');
    } else {
      message.reply('❌ Erreur : Impossible de trouver le salon de recrutement.');
    }
  }

  if (message.content === '!ticket') {
    const ticketEmbed = new EmbedBuilder()
      .setColor('#e52d48')
      .setTitle('Urgence Lilloise — Support')
      .setDescription(
        "Vous avez besoin d'aide ?\n" +
        "Notre équipe de staff est disponible pour vous accompagner.\n\n" +
        "**Sélectionnez une catégorie** dans le menu ci-dessous pour ouvrir votre ticket.\n\n" +
        "💬 **Question** — Une question générale sur le serveur\n" +
        "🛒 **Boutique** — Achat, paiement, commande boutique\n" +
        "💢 **Bug IG** — Signaler un bug en jeu\n" +
        "💵 **Légal** — Reprise d'entreprise légale\n" +
        "💼 **Illégal** — Reprise de groupe illégal\n" +
        "🍓 **Unban** — Demande de débannissement\n" +
        "🚨 **Plainte Staff** — Signaler un membre du staff\n\n" +
        "⚠️ **Avant d'ouvrir un ticket**\n" +
        "Assurez-vous de ne pas avoir de ticket déjà ouvert.\n" +
        "Préparez toutes les informations nécessaires (preuves, ID, captures d'écran).\n" +
        "Restez respectueux envers le staff."
      )
      .setImage(TICKET_BANNER_URL)
      .setFooter({ text: 'Support — Urgence Lilloise' });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_select_menu')
      .setPlaceholder('Sélectionne ce que tu as besoin.')
      .addOptions([
        new StringSelectMenuOptionBuilder().setLabel('Question').setDescription('Une question générale sur le serveur').setValue('ticket_question').setEmoji('💬'),
        new StringSelectMenuOptionBuilder().setLabel('Boutique').setDescription('Achat, paiement, commande boutique').setValue('ticket_boutique').setEmoji('🛒'),
        new StringSelectMenuOptionBuilder().setLabel('Bug IG').setDescription('Signaler un bug en jeu').setValue('ticket_bug').setEmoji('💢'),
        new StringSelectMenuOptionBuilder().setLabel('Légal').setDescription('Reprise d\'entreprise légale').setValue('ticket_legal').setEmoji('💵'),
        new StringSelectMenuOptionBuilder().setLabel('Illégal').setDescription('Reprise de groupe illégal').setValue('ticket_illegal').setEmoji('💼'),
        new StringSelectMenuOptionBuilder().setLabel('Unban').setDescription('Demande de débannissement').setValue('ticket_unban').setEmoji('🍓'),
        new StringSelectMenuOptionBuilder().setLabel('Plainte Staff').setDescription('Signaler un membre du staff').setValue('ticket_plainte').setEmoji('🚨'),
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const ticketChannel = client.channels.cache.get(TICKET_CHANNEL_ID);
    if (ticketChannel) {
      await ticketChannel.send({ embeds: [ticketEmbed], components: [row] });
      message.reply('✅ Panel de tickets envoyé avec succès dans le salon dédié !');
    } else {
      message.reply('❌ Erreur : Impossible de trouver le salon des tickets.');
    }
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

// Routes du site web
app.get('/', (req, res) => res.render('index'));
app.get('/recrutement', (req, res) => res.render('recrutement'));
app.get('/boutique', (req, res) => res.render('boutique'));
app.get('/reglement', (req, res) => res.render('reglement'));

// Traitement du formulaire de recrutement
app.post('/recrutement', applyLimiter, async (req, res) => {
  try {
    const { poste, discordTag, discordId, prenom, age, motivation, pourquoiVous, roleSupport, sitTicket, sitAbus } = req.body;

    const channel = await client.channels.fetch(CANDIDATURE_DEST_CHANNEL_ID).catch(() => null);
    if (!channel) {
      return res.status(500).json({ error: "Salon de destination des candidatures introuvable." });
    }

    const postName = poste ? poste.toUpperCase() : 'SUPPORT';

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle(`DOSSIER DE CANDIDATURE — ${postName}`)
      .setThumbnail(LOGO_URL)
      .addFields(
        { name: 'Identification Discord', value: `• **Compte :** \`${discordTag || 'Inconnu'}\`\n• **ID :** \`${discordId || 'Inconnu'}\``, inline: false },
        { name: 'Informations IRL', value: `• **Prénom :** ${prenom || 'Non renseigné'}\n• **Âge :** ${age || 'Non renseigné'} ans`, inline: false },
        { name: '⭐ QUESTIONS SUR VOUS', value: '----------------------------------------', inline: false },
        { name: 'Quels sont vos motivations ?', value: `\`\`\`text\n${motivation || 'Aucune'}\n\`\`\``, inline: false },
        { name: 'Pourquoi vous et pas un autre ?', value: `\`\`\`text\n${pourquoiVous || 'Aucune'}\n\`\`\``, inline: false },
        { name: 'Selon vous, a quoi consiste le role d\'un support ?', value: `\`\`\`text\n${roleSupport || 'Aucune'}\n\`\`\``, inline: false },
        { name: '⚖️ MISE EN SITUATION', value: '----------------------------------------', inline: false },
        { name: 'Lorsqu\'un joueur ouvre un ticket, vous devez :', value: `\`\`\`text\n${sitTicket || 'Aucune'}\n\`\`\``, inline: false },
        { name: 'Un autre support abuse de ses perms devant vous, que faites vous ?', value: `\`\`\`text\n${sitAbus || 'Aucune'}\n\`\`\``, inline: false },
        { name: 'Statut du Dossier', value: '⏳ **EN ATTENTE DE TRAITEMENT**', inline: false }
      )
      .setFooter({ text: 'Urgence Lilloise — Système de Recrutement • Made by ymn_0ffcl' });

    const targetId = discordId ? discordId.replace(/[^0-9]/g, '') : 'unknown';

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`accept_${targetId}`)
          .setLabel('Accepter')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`refuse_${targetId}`)
          .setLabel('Refuser')
          .setStyle(ButtonStyle.Danger)
      );

    const pingRoles = '<@&1530783982197805121> <@&1530783982210519232>';
    await channel.send({ content: `${pingRoles} 🔔 **Nouvelle candidature reçue !**`, embeds: [embed], components: [row] });

    return res.status(200).json({ success: true, message: "Candidature envoyée avec succès !" });
  } catch (error) {
    console.error("Erreur lors de l'envoi de la candidature :", error);
    return res.status(500).json({ error: "Erreur interne du serveur." });
  }
});

// Gestion des Interactions
client.on('interactionCreate', async (interaction) => {
  try {
    // Gestion du menu déroulant des tickets
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_select_menu') {
        const selectedValue = interaction.values[0];
        const ticketInfo = TICKET_CATEGORIES[selectedValue];

        if (!ticketInfo) {
          return interaction.reply({ content: '❌ Erreur : Catégorie de ticket invalide.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        const user = interaction.user;

        const channelName = `${ticketInfo.name}-${user.username}`.toLowerCase().replace(/[^a-z0-9-_]/g, '');
        
        const ticketChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: ticketInfo.categoryId,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
              id: user.id,
              allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
            },
          ],
        }).catch(err => {
          console.error("Erreur lors de la création du salon de ticket :", err);
          return null;
        });

        if (!ticketChannel) {
          return interaction.editReply({ content: '❌ Impossible de créer le salon du ticket. Vérifiez les IDs de catégorie.' });
        }

        // Sauvegarde des métadonnées du ticket
        activeTickets.set(ticketChannel.id, {
          userId: user.id,
          createdAt: Date.now()
        });

        const welcomeEmbed = new EmbedBuilder()
          .setColor('#e52d48')
          .setTitle(`Ticket : ${ticketInfo.title}`)
          .setDescription(`Bonjour ${user}, bienvenue dans votre ticket.\nUn membre de l'équipe va s'occuper de vous très rapidement.\n\nVeuillez exposer votre problème en détail avec un maximum de preuves/captures d'écran si nécessaire.`)
          .setThumbnail(LOGO_URL)
          .setTimestamp();

        const closeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Fermer le ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
        );

        await ticketChannel.send({ content: `${user}`, embeds: [welcomeEmbed], components: [closeRow] });

        await interaction.editReply({ content: `✅ Votre ticket a été créé avec succès : ${ticketChannel}` });
      }
    }

    if (interaction.isButton()) {
      // 1. Bouton "Fermer le ticket" -> Ouvre le Modal pour demander la raison
      if (interaction.customId === 'close_ticket') {
        const modal = new ModalBuilder()
          .setCustomId('modal_close_ticket')
          .setTitle('Fermeture du ticket');

        const reasonInput = new TextInputBuilder()
          .setCustomId('close_reason')
          .setLabel('Raison de la fermeture :')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Ex: Problème résolu, joueur absent, etc.')
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        return await interaction.showModal(modal);
      }

      const [action, targetUserId] = interaction.customId.split('_');
      
      if (action === 'accept') {
        await interaction.deferUpdate();
        const staffUser = interaction.user;
        const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]);

        const acceptEmbed = new EmbedBuilder()
          .setTitle("🪪 Recrutement")
          .setDescription("Votre demande de recrutement vient d'être revue.\n\n🌐 **Statut de la réponse**\n> **Acceptée.**\n\n🎉 Félicitation ! Votre candidature a été acceptée !\nIl vous est donc demandé d'ouvrir un ticket sur le Discord principal, dans la catégorie **recrutement**, afin de poursuivre les formalités. Merci de ne faire aucune mention (@) dans votre ticket.")
          .setColor(0x2ED573)
          .setThumbnail(LOGO_URL)
          .setFooter({ text: "ymn_0ffcl | Tous droits réservés" });

        if (targetUserId && targetUserId !== 'unknown') {
          const targetUser = await client.users.fetch(targetUserId).catch(() => null);
          if (targetUser) {
            await targetUser.send({ embeds: [acceptEmbed] }).catch(() => console.log("Impossible d'envoyer un MP."));
          }
        }

        const fields = originalEmbed.data.fields || [];
        const updatedFields = fields.map(f => {
          if (f.name === 'Statut du Dossier') {
            return { name: 'Statut du Dossier', value: `✅ **ACCEPTÉ** par ${staffUser.tag}`, inline: false };
          }
          return f;
        });

        originalEmbed.setColor(0x2ED573).setFields(updatedFields);
        await interaction.editReply({ embeds: [originalEmbed], components: [] });

      } else if (action === 'refuse') {
        const modal = new ModalBuilder()
          .setCustomId(`modal_refuse_${targetUserId}`)
          .setTitle('Motif du refus de la candidature');

        const reasonInput = new TextInputBuilder()
          .setCustomId('refuse_reason')
          .setLabel('Raison du refus :')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Ex: Réponse trop courte, profil inadapté...')
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(modal);
      }
    }

    if (interaction.isModalSubmit()) {
      // 2. Traitement du Modal de fermeture de ticket (avec la raison)
      if (interaction.customId === 'modal_close_ticket') {
        const closeReason = interaction.fields.getTextInputValue('close_reason');
        await interaction.reply({ content: '🔒 Fermeture du ticket et génération du transcript en cours...', ephemeral: true });

        const channel = interaction.channel;
        const guild = interaction.guild;
        const staffMember = interaction.user;
        const ticketData = activeTickets.get(channel.id);

        let targetUser = null;
        if (ticketData) {
          targetUser = await guild.members.fetch(ticketData.userId).catch(() => null);
        }

        // Récupération des messages pour le transcript
        let messagesCollection;
        try {
          messagesCollection = await channel.messages.fetch({ limit: 100 });
        } catch {
          messagesCollection = [];
        }

        const messages = Array.from(messagesCollection.values()).reverse();
        const messageCount = messages.length;

        // Génération du HTML du transcript (incluant la raison de fermeture)
        let htmlContent = `
        <html>
        <head>
          <meta charset="utf-8">
          <title>Transcript - ${channel.name}</title>
          <style>
            body { background-color: #313338; color: #dbdee1; font-family: Arial, sans-serif; padding: 20px; }
            .reason-box { background-color: #2b2d31; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #e52d48; }
            .msg { margin-bottom: 15px; }
            .author { font-weight: bold; color: #ffffff; }
            .time { font-size: 11px; color: #949ba4; margin-left: 5px; }
            .content { margin-top: 5px; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h2>Transcript du salon : #${channel.name}</h2>
          <div class="reason-box">
            <strong>Raison de fermeture :</strong> ${closeReason}
          </div>
          <hr style="border: 0; border-top: 1px solid #4e5058;"><br>
        `;

        messages.forEach(m => {
          const timeStr = new Date(m.createdTimestamp).toLocaleString();
          htmlContent += `
            <div class="msg">
              <span class="author">${m.author.tag}</span><span class="time">${timeStr}</span>
              <div class="content">${m.content || '[Contenu multimédia / Embed]'}</div>
            </div>
          `;
        });

        htmlContent += `</body></html>`;

        const transcriptBuffer = Buffer.from(htmlContent, 'utf-8');
        const transcriptAttachment = new AttachmentBuilder(transcriptBuffer, { name: `transcript-${channel.name}.html` });

        // Calcul de la durée du ticket
        let durationText = "Inconnue";
        if (ticketData) {
          const diffMs = Date.now() - ticketData.createdAt;
          const diffMins = Math.floor(diffMs / 60000);
          if (diffMins < 1) durationText = "Moins d'une minute";
          else if (diffMins === 1) durationText = "1 minute";
          else durationText = `${diffMins} minutes`;
        }

        const currentDateStr = new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });

        const embedDetails = new EmbedBuilder()
          .setColor('#e52d48')
          .setTitle('🔒 Ticket Fermé')
          .setDescription(`Ticket fermé sur **Urgence Lilloise**.`)
          .setThumbnail(SERVER_ICON_URL)
          .addFields(
            { name: '📋 Type de ticket', value: `\`${channel.name}\``, inline: true },
            { name: '👤 Fermé par', value: `\`${staffMember.tag}\``, inline: true },
            { name: '📌 Raison', value: `\`\`\`\n${closeReason}\n\`\`\``, inline: false },
            { name: '📅 Date de fermeture', value: `\`${currentDateStr}\``, inline: true },
            { name: '⏱️ Durée du ticket', value: `\`${durationText}\``, inline: true },
            { name: '📊 Nombre de messages', value: `${messageCount}`, inline: true },
            { name: '📄 Transcript', value: 'Un fichier de transcription complet est joint.', inline: false }
          )
          .setFooter({ text: 'Support — Urgence Lilloise' })
          .setTimestamp();

        // 1. Envoi au joueur en MP
        if (targetUser) {
          await targetUser.send({ embeds: [embedDetails], files: [transcriptAttachment] }).catch(() => {
            console.log("Impossible d'envoyer le MP au joueur (privés fermés).");
          });
        }

        // 2. Envoi dans le salon de logs (1531727851680698379)
        const logsChannel = guild.channels.cache.get(TICKET_LOGS_CHANNEL_ID);
        if (logsChannel) {
          const logEmbed = EmbedBuilder.from(embedDetails)
            .setDescription(`Ticket \`${channel.name}\` fermé par ${staffMember} (Propriétaire : ${targetUser || 'Inconnu'})`);
          
          await logsChannel.send({ embeds: [logEmbed], files: [transcriptAttachment] }).catch(err => {
            console.error("Erreur lors de l'envoi dans le salon de logs :", err);
          });
        }

        activeTickets.delete(channel.id);

        // Suppression du salon après 3 secondes
        setTimeout(async () => {
          await channel.delete().catch(() => {});
        }, 3000);
        return;
      }

      if (interaction.customId.startsWith('modal_refuse_')) {
        const targetUserId = interaction.customId.replace('modal_refuse_', '');
        const reason = interaction.fields.getTextInputValue('refuse_reason');

        await interaction.deferUpdate();

        const staffUser = interaction.user;
        const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]);

        const refuseEmbed = new EmbedBuilder()
          .setTitle("🪪 Recrutement")
          .setDescription(`Votre demande de recrutement vient d'être revue.\n\n🌐 **Statut de la réponse**\n> **Refusée.**\n\n❌ Bonjour. Nous vous informons que votre candidature pour **Urgence Lilloise** n'a malheureusement **pas été retenue**.\n\n📌 **Raison du refus :**\n> *${reason}*\n\nMerci pour l'intérêt que vous portez à notre serveur.`)
          .setColor(0xE52D48)
          .setThumbnail(LOGO_URL)
          .setFooter({ text: "ymn_0ffcl | Tous droits réservés" });

        if (targetUserId && targetUserId !== 'unknown') {
          const targetUser = await client.users.fetch(targetUserId).catch(() => null);
          if (targetUser) {
            await targetUser.send({ embeds: [refuseEmbed] }).catch(() => console.log("Impossible d'envoyer un MP."));
          }
        }

        const fields = originalEmbed.data.fields || [];
        const updatedFields = fields.map(f => {
          if (f.name === 'Statut du Dossier') {
            return { name: 'Statut du Dossier', value: `❌ **REFUSÉ** par ${staffUser.tag}\n**Raison :** \`\`\`\n${reason}\n\`\`\``, inline: false };
          }
          return f;
        });

        originalEmbed.setColor(0xE52D48).setFields(updatedFields);
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
