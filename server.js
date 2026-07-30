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
const RECRUTEMENT_CHANNEL_ID = '1530783982877278213';
const CANDIDATURE_DEST_CHANNEL_ID = '1530783985045606508';
const TICKET_CHANNEL_ID = '1530783984143962204';
const TICKET_LOGS_CHANNEL_ID = '1531727851680698379'; // Salon de transcript
const LOGO_URL = 'https://media.discordapp.net/attachments/1526171548472446986/1527347546618593441/logo-ul.png?ex=6a68d53f&is=6a6783bf&hm=41577189ad8d5c5fe693891bccd581b7b7623419699f2bfadf1822c1bec7443b&=&format=webp&quality=lossless';
const TICKET_BANNER_URL = 'https://media.discordapp.net/attachments/1530783984143962204/1532199713468841994/image.png?ex=6a6bfbae&is=6a6aaa2e&hm=f647b951b1389272d866ec5381b8fb42be9c70468ad5b1dc1e20f9eac077a586&=&format=webp&quality=lossless';
const SERVER_ICON_URL = 'https://images-ext-1.discordapp.net/external/13dVJvwLxmIyN952nvst_nHPVhRaOG98o5eg0L09rUw/%3Fsize%3D256/https/cdn.discordapp.com/icons/1530783981988085853/01bad94e7ccac907a3d138d7575b101a.png?format=webp&quality=lossless';

// Correspondance exacte des catégories avec leurs rôles spécifiques
const TICKET_CATEGORIES = {
  'ticket_question': { 
    name: 'question', 
    categoryId: '1532213199863283712', 
    title: 'Question',
    allowedRoles: ['1530783982197805117'] 
  },
  'ticket_boutique': { 
    name: 'boutique', 
    categoryId: '1532213765431627816', 
    title: 'Boutique',
    allowedRoles: ['1530783982210519235'] 
  },
  'ticket_bug': { 
    name: 'bug-ig', 
    categoryId: '1532213885971599442', 
    title: 'Bug IG',
    allowedRoles: ['1530783982122303541'] 
  },
  'ticket_legal': { 
    name: 'legal', 
    categoryId: '1532214069556281434', 
    title: 'Légal',
    allowedRoles: ['1531701094709854339'] 
  },
  'ticket_illegal': { 
    name: 'illegal', 
    categoryId: '1532214202343751780', 
    title: 'Illégal',
    allowedRoles: ['1531701011029164252'] 
  },
  'ticket_unban': { 
    name: 'unban', 
    categoryId: '1532214399945936896', 
    title: 'Unban',
    allowedRoles: ['1530783982180896887', '1530783982180896886', '1530783982151794743'] 
  },
  'ticket_plainte_joueur': { 
    name: 'plainte-joueur', 
    categoryId: '1532214555990818999', 
    title: 'Plainte Joueur',
    allowedRoles: ['1530783982197805117'] 
  },
  'ticket_plainte': { 
    name: 'plainte-staff', 
    categoryId: '1532214697485537381', 
    title: 'Plainte Staff',
    allowedRoles: ['1530783982210519236'] 
  }
};

// Stockage pour le suivi des tickets actifs (ID du salon -> infos)
const activeTickets = new Map();

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

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (activeTickets.has(message.channel.id)) {
    const args = message.content.trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === '.rename') {
      const newName = args.join('-');
      if (!newName) return message.reply({ content: '❌ Utilisation : `.rename <nouveau-nom>`' });
      try {
        await message.channel.setName(newName);
        return message.reply({ content: `✅ Salon renommé en **${newName}** avec succès.` });
      } catch (err) {
        return message.reply({ content: '❌ Erreur lors du renommage du salon.' });
      }
    }

    if (command === '.add') {
      const targetMember = message.mentions.members.first();
      if (!targetMember) return message.reply({ content: '❌ Utilisation : `.add @membre`' });
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

    if (command === '.del') {
      const targetMember = message.mentions.members.first();
      if (!targetMember) return message.reply({ content: '❌ Utilisation : `.del @membre`' });
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

  if (message.content === '!ticket') {
    const ticketEmbed = new EmbedBuilder()
      .setColor('#e52d48')
      .setTitle('Urgence Lilloise — Support')
      .setDescription(
        "Vous avez besoin d'aide ?\n" +
        "Notre équipe de staff est disponible pour vous accompagner.\n\n" +
        "**Sélectionnez une catégorie** dans le menu ci-dessous pour ouvrir votre ticket."
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
        new StringSelectMenuOptionBuilder().setLabel('Plainte Joueur').setDescription('Signaler un joueur').setValue('ticket_plainte_joueur').setEmoji('⚖️'),
        new StringSelectMenuOptionBuilder().setLabel('Plainte Staff').setDescription('Signaler un membre du staff').setValue('ticket_plainte').setEmoji('🚨'),
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    const ticketChannel = client.channels.cache.get(TICKET_CHANNEL_ID);
    if (ticketChannel) {
      await ticketChannel.send({ embeds: [ticketEmbed], components: [row] });
      message.reply('✅ Panel de tickets envoyé avec succès !');
    }
  }
});

// Configuration Express & Web
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ================= Web Routes =================
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/recrutement', (req, res) => {
  res.render('recrutement');
});

app.get('/reglement', (req, res) => {
  res.render('reglement');
});

// Route pour traiter l'envoi du formulaire de recrutement vers Discord
app.post('/recrutement', async (req, res) => {
  try {
    const { poste, discordTag, discordId, prenom, age, ambitions, pourquoiVous, experiences, roleModerateur } = req.body;
    
    const channel = client.channels.cache.get(CANDIDATURE_DEST_CHANNEL_ID || RECRUTEMENT_CHANNEL_ID);
    if (!channel) {
      return res.status(500).json({ error: "Salon de recrutement introuvable sur Discord." });
    }

    const embed = new EmbedBuilder()
      .setColor('#2ed573')
      .setTitle(`DOSSIER DE CANDIDATURE — ${poste ? poste.toUpperCase() : 'MODÉRATION'}`)
      .setThumbnail(SERVER_ICON_URL)
      .addFields(
        { 
          name: 'Identification Discord', 
          value: `• **Compte :** \`${discordTag || 'Non spécifié'}\`\n• **ID :** \`${discordId || 'Non spécifié'}\``, 
          inline: false 
        },
        { 
          name: 'Informations IRL', 
          value: `• **Prénom :** ${prenom || 'N/A'}\n• **Âge :** ${age || 'N/A'} ans`, 
          inline: false 
        },
        { 
          name: 'Vos ambitions dans notre staff', 
          value: `\`\`\`text\n${ambitions || 'Aucune ambition renseignée'}\n\`\`\``, 
          inline: false 
        },
        { 
          name: '🔥 INFORMATIONS : MOTIVATION\n--------------------------------------------------', 
          value: `**Pourquoi vous et pas un autre ?**\n\`\`\`text\n${pourquoiVous || 'Non renseigné'}\n\`\`\`\n**Vos expériences :**\n\`\`\`text\n${experiences || 'Aucune expérience mentionnée'}\n\`\`\`\n**Dans vos mots, en quoi consiste le rôle d'un modérateur ?**\n\`\`\`text\n${roleModerateur || 'Non renseigné'}\n\`\`\``, 
          inline: false 
        }
      )
      .setTimestamp()
      .setFooter({ text: 'Urgence Lilloise — Système de Recrutement', iconURL: LOGO_URL });

    const targetId = discordId ? discordId.replace(/[^0-9]/g, '') : 'unknown';

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`accept_${targetId}`).setLabel('Accepter').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`refuse_${targetId}`).setLabel('Refuser').setStyle(ButtonStyle.Danger)
    );

    // Ping unique avec le rôle demandé
    const staffPing = `<@&1531701186980352001>`;
    
    await channel.send({ content: `🔔 **Nouvelle candidature reçue !** ${staffPing}`, embeds: [embed], components: [row] });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Erreur lors de l'envoi de la candidature:", err);
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
});
// ==============================================

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_select_menu') {
        const selectedValue = interaction.values[0];
        const ticketInfo = TICKET_CATEGORIES[selectedValue];

        if (!ticketInfo) {
          return interaction.reply({ content: '❌ Erreur : Catégorie invalide.', ephemeral: true });
        }

        // CORRECTION ICI : Utilisation de deferUpdate pour acquérir instantanément l'interaction
        await interaction.deferUpdate();

        const guild = interaction.guild;
        const user = interaction.user;
        const channelName = `${ticketInfo.name}-${user.username}`.toLowerCase().replace(/[^a-z0-9-_]/g, '');
        
        const permissionOverwrites = [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel, 
              PermissionsBitField.Flags.SendMessages, 
              PermissionsBitField.Flags.ReadMessageHistory
            ],
          }
        ];

        if (ticketInfo.allowedRoles) {
          for (const roleId of ticketInfo.allowedRoles) {
            permissionOverwrites.push({
              id: roleId,
              allow: [
                PermissionsBitField.Flags.ViewChannel, 
                PermissionsBitField.Flags.SendMessages, 
                PermissionsBitField.Flags.ReadMessageHistory
              ],
            });
          }
        }

        const ticketChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: ticketInfo.categoryId,
          permissionOverwrites: permissionOverwrites,
          lockPermissions: false 
        }).catch(err => {
          console.error("Erreur création salon:", err);
          return null;
        });

        if (!ticketChannel) {
          return interaction.followUp({ content: '❌ Impossible de créer le salon du ticket.', ephemeral: true });
        }

        activeTickets.set(ticketChannel.id, {
          userId: user.id,
          createdAt: Date.now()
        });

        const welcomeEmbed = new EmbedBuilder()
          .setColor('#e52d48')
          .setTitle(`Ticket : ${ticketInfo.title}`)
          .setDescription(`Bonjour ${user}, bienvenue dans votre ticket.\nUn membre de l'équipe va s'occuper de vous très rapidement.`)
          .setThumbnail(LOGO_URL)
          .setTimestamp();

        const closeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Fermer le ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
        );

        const pings = ticketInfo.allowedRoles.map(rId => `<@&${rId}>`).join(' ');
        await ticketChannel.send({ content: `${user} ${pings}`, embeds: [welcomeEmbed], components: [closeRow] });

        await interaction.followUp({ content: `✅ Votre ticket a été créé avec succès : ${ticketChannel}`, ephemeral: true });
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'close_ticket') {
        const modal = new ModalBuilder()
          .setCustomId('modal_close_ticket')
          .setTitle('Fermeture du ticket');

        const reasonInput = new TextInputBuilder()
          .setCustomId('close_reason')
          .setLabel('Raison de la fermeture :')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Ex: Problème résolu')
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        return await interaction.showModal(modal);
      }

      if (interaction.customId.startsWith('accept_') || interaction.customId.startsWith('refuse_')) {
        const [action, targetUserId] = interaction.customId.split('_');

        if (action === 'accept') {
          await interaction.deferUpdate();
          const staffUser = interaction.user;
          const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]);

          const acceptEmbed = new EmbedBuilder()
            .setTitle("🪪 Recrutement")
            .setDescription("Votre candidature a été **acceptée** !")
            .setColor(0x2ED573)
            .setThumbnail(LOGO_URL);

          if (targetUserId && targetUserId !== 'unknown') {
            const targetUser = await client.users.fetch(targetUserId).catch(() => null);
            if (targetUser) await targetUser.send({ embeds: [acceptEmbed] }).catch(() => {});
          }

          const fields = originalEmbed.data.fields || [];
          const updatedFields = fields.map(f => {
            if (f.name === '📌 Statut' || f.name === 'Statut du Dossier') {
              return { name: '📌 Statut', value: `✅ Accepté par ${staffUser.tag}`, inline: false };
            }
            return f;
          });

          if (!fields.some(f => f.name === '📌 Statut')) {
            updatedFields.push({ name: '📌 Statut', value: `✅ Accepté par ${staffUser.tag}`, inline: false });
          }

          originalEmbed.setColor(0x2ED573).setFields(updatedFields);
          await interaction.editReply({ embeds: [originalEmbed], components: [] });

        } else if (action === 'refuse') {
          const modal = new ModalBuilder()
            .setCustomId(`modal_refuse_${targetUserId}`)
            .setTitle('Motif du refus');

          const reasonInput = new TextInputBuilder()
            .setCustomId('refuse_reason')
            .setLabel('Raison du refus :')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

          modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
          await interaction.showModal(modal);
        }
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('modal_refuse_')) {
        const targetUserId = interaction.customId.replace('modal_refuse_', '');
        const reason = interaction.fields.getTextInputValue('refuse_reason');
        await interaction.deferUpdate();

        const staffUser = interaction.user;
        const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]);

        const refuseEmbed = new EmbedBuilder()
          .setTitle("🪪 Recrutement")
          .setDescription(`Votre candidature n'a malheureusement **pas été retenue**.\n\n**Raison :** ${reason}`)
          .setColor(0xE52D48)
          .setThumbnail(LOGO_URL);

        if (targetUserId && targetUserId !== 'unknown') {
          const targetUser = await client.users.fetch(targetUserId).catch(() => null);
          if (targetUser) await targetUser.send({ embeds: [refuseEmbed] }).catch(() => {});
        }

        const fields = originalEmbed.data.fields || [];
        const updatedFields = fields.map(f => {
          if (f.name === '📌 Statut' || f.name === 'Statut du Dossier') {
            return { name: '📌 Statut', value: `❌ Refusé par ${staffUser.tag}\n**Raison :** ${reason}`, inline: false };
          }
          return f;
        });

        if (!fields.some(f => f.name === '📌 Statut')) {
          updatedFields.push({ name: '📌 Statut', value: `❌ Refusé par ${staffUser.tag}\n**Raison :** ${reason}`, inline: false });
        }

        originalEmbed.setColor(0xE52D48).setFields(updatedFields);
        await interaction.editReply({ embeds: [originalEmbed], components: [] });
      }

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

        let messagesCollection;
        try {
          messagesCollection = await channel.messages.fetch({ limit: 100 });
        } catch {
          messagesCollection = [];
        }

        const messages = Array.from(messagesCollection.values()).reverse();
        const messageCount = messages.length;

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

        if (targetUser) {
          await targetUser.send({ embeds: [embedDetails], files: [transcriptAttachment] }).catch(() => {
            console.log("Impossible d'envoyer le MP au joueur (privés fermés).");
          });
        }

        const logsChannel = guild.channels.cache.get(TICKET_LOGS_CHANNEL_ID);
        if (logsChannel) {
          await logsChannel.send({ embeds: [embedDetails], files: [transcriptAttachment] }).catch(err => {
            console.error("Erreur lors de l'envoi dans le salon de transcript :", err);
          });
        }

        activeTickets.delete(channel.id);

        setTimeout(async () => {
          await channel.delete().catch(() => {});
        }, 3000);
      }
    }

  } catch (error) {
    console.error("Erreur interaction:", error);
  }
});

app.listen(PORT, () => {
  console.log(`Serveur Web démarré sur le port ${PORT}`);
});
