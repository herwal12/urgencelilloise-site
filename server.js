const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
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

// Gestion des Clics sur les Boutons (Accepter / Refuser)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const [action, targetUserId] = interaction.customId.split('_');
  if (!['accept', 'refuse'].includes(action)) return;

  await interaction.deferUpdate();

  const staffUser = interaction.user;
  const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]);

  try {
    // Tentative d'envoi du Message Privé au candidat
    const targetUser = await client.users.fetch(targetUserId);

    if (action === 'accept') {
      await targetUser.send({
        content: `Félicitation ! Votre candidature visant la modération de notre serveur a été accepté !\nIl vous est donc demandé d'ouvrir un ticket sur le Discord principal, dans la catégorie Direction, afin de poursuivre les formalités. Merci de ne faire aucune mention (@) dans votre ticket.`
      }).catch(() => console.log("Impossible d'envoyer un MP au membre (MP fermés)."));

      originalEmbed.setColor(0x2ED573); // Vert
      originalEmbed.addFields({ name: "Statut du Dossier", value: `✅ **ACCEPTÉ** par ${staffUser.tag}`, inline: false });

    } else if (action === 'refuse') {
      await targetUser.send({
        content: `Bonjour. Nous vous informons que votre candidature pour le staff d'**Urgence Lilloise** n'a malheureusement **pas été retenue**.\nMerci pour l'intérêt que vous portez à notre serveur.`
      }).catch(() => console.log("Impossible d'envoyer un MP au membre (MP fermés)."));

      originalEmbed.setColor(0xE52D48); // Rouge
      originalEmbed.addFields({ name: "Statut du Dossier", value: `❌ **REFUSÉ** par ${staffUser.tag}`, inline: false });
    }

    // Mise à jour du message sur Discord (désactivation des boutons)
    await interaction.editReply({
      embeds: [originalEmbed],
      components: []
    });

  } catch (error) {
    console.error("Erreur lors du traitement du bouton :", error);
  }
});

  } catch (error) {
    console.error("Erreur lors du traitement du bouton :", error);
  }
});

  } catch (error) {
    console.error("Erreur lors du traitement du bouton :", error);
  }
});

app.listen(PORT, () => {
  console.log(`Serveur Web démarré sur le port ${PORT}`);
});
