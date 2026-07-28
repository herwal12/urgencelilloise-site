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
const CANDIDATURE_DEST_CHANNEL_ID = '1530409770539024465'; // Salon où arrivent les candidatures du site
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

// Commande pour envoyer le panel de recrutement fermé dans le salon dédié
client.on('messageCreate', async (message) => {
  if (message.author.bot || message.content !== '!panel') return;

  const embed = new EmbedBuilder()
    .setColor('#e52d48')
    .setTitle('URGENCE LILLOISE • RECRUTEMENTS')
    .setDescription("Comme dit, les recrutements sont dorénavant fermé. Il vous est donc impossible de postuler.")
    .setThumbnail(LOGO_URL) // Place le logo en haut à droite
    .setFooter({ text: 'Urgence Lilloise • Équipe de recrutement' })
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('recrutement_ferme')
        .setLabel('Recrutements fermés ❌')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true) // Bouton désactivé et grisé
    );

  const channel = client.channels.cache.get(RECRUTEMENT_CHANNEL_ID);
  if (channel) {
    await channel.send({ embeds: [embed], components: [row] });
    message.reply('✅ Panel de recrutement mis à jour et envoyé avec succès !');
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

// Routes du site web (incluant la route /reglement)
app.get('/', (req, res) => res.render('index'));
app.get('/recrutement', (req, res) => res.render('recrutement'));
app.get('/boutique', (req, res) => res.render('boutique'));
app.get('/reglement', (req, res) => res.render('reglement'));

// Traitement du formulaire de recrutement (Bloqué car fermé)
app.post('/recrutement', applyLimiter, async (req, res) => {
  return res.status(400).json({ error: "Les recrutements sont actuellement fermés. Impossible de postuler." });
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
        const targetUser = await client.users.fetch(targetUserId);

        const acceptEmbed = new EmbedBuilder()
          .setTitle("🪪 Recrutement")
          .setDescription("Votre demande de recrutement vient d'être revue.\n\n🌐 **Statut de la réponse**\n> **Acceptée.**\n\n🎉 Félicitation ! Votre candidature visant la modération de notre serveur a été acceptée !\nIl vous est donc demandé d'ouvrir un ticket sur le Discord principal, dans la catégorie **Recrutement**, afin de poursuivre les formalités. Merci de ne faire aucune mention (@) dans votre ticket.")
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
