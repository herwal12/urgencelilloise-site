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

// Variables d'environnement & IDs
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const RECRUTEMENT_CHANNEL_ID = '1530783982877278213'; // Salon pour envoyer le panel !panel
const CANDIDATURE_DEST_CHANNEL_ID = '1530783985045606508'; // Salon où arrivent les candidatures du site
const LOGO_URL = 'https://media.discordapp.net/attachments/1526171548472446986/1527347546618593441/logo-ul.png?ex=6a68d53f&is=6a6783bf&hm=41577189ad8d5c5fe693891bccd581b7b7623419699f2bfadf1822c1bec7443b&=&format=webp&quality=lossless';

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

// Commande !panel : Texte d'origine exact
client.on('messageCreate', async (message) => {
  if (message.author.bot || message.content !== '!panel') return;

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

// Traitement du formulaire de recrutement (Mis à jour avec les nouvelles questions)
app.post('/recrutement', applyLimiter, async (req, res) => {
  try {
    const { poste, discordTag, discordId, prenom, age, motivation, pourquoiVous, roleSupport, sitTicket, sitAbus } = req.body;

    const channel = await client.channels.fetch(CANDIDATURE_DEST_CHANNEL_ID).catch(() => null);
    if (!channel) {
      return res.status(500).json({ error: "Salon de destination des candidatures introuvable." });
    }

    const postName = poste ? poste.toUpperCase() : 'SUPPORT';

    const limitText = (text) => {
        if (!text) return 'Aucune';
        return text.length > 1024 ? text.substring(0, 1021) + '...' : text;
    };

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle(`DOSSIER DE CANDIDATURE — ${postName}`)
      .setThumbnail(LOGO_URL)
      .addFields(
        { name: 'Identification Discord', value: `• **Compte :** \`${discordTag || 'Inconnu'}\`\n• **ID :** \`${discordId || 'Inconnu'}\``, inline: false },
        { name: 'Informations IRL', value: `• **Prénom :** ${prenom || 'Non renseigné'}\n• **Âge :** ${age || 'Non renseigné'} ans`, inline: false },
        { name: '⭐ QUESTIONS SUR VOUS', value: '----------------------------------------', inline: false },
        { name: 'Quels sont vos motivations ?', value: limitText(motivation), inline: false },
        { name: 'Pourquoi vous et pas un autre ?', value: limitText(pourquoiVous), inline: false },
        { name: 'Selon vous, a quoi consiste le role d\'un support ?', value: limitText(roleSupport), inline: false },
        { name: '⚖️ MISE EN SITUATION', value: '----------------------------------------', inline: false },
        { name: 'Lorsqu\'un joueur ouvre un ticket, vous devez :', value: limitText(sitTicket), inline: false },
        { name: 'Un autre support abuse de ses perms devant vous, que faites vous ?', value: limitText(sitAbus), inline: false },
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

// Gestion des Interactions (Boutons et Modals)
client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isButton()) {
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
