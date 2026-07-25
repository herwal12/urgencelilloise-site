const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Webhook Discord
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "TON_LIEN_WEBHOOK_ICI";

// Configuration EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Limitation de requêtes (anti-spam)
const applyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 essais max
  message: { error: "Trop de tentatives. Réessayez plus tard." }
});

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/recrutement', (req, res) => {
  res.render('recrutement');
});

app.get('/boutique', (req, res) => {
  res.render('boutique');
});

// Traitement du recrutement
app.post('/recrutement', applyLimiter, async (req, res) => {
  const { 
    service, 
    discordTag, 
    discordId, 
    prenom, 
    age, 
    ambition, 
    motivation, 
    experience, 
    roleModerateur 
  } = req.body;

  if (!discordTag || !discordId || !prenom || !age || !motivation) {
    return res.status(400).json({ error: "Veuillez remplir tous les champs obligatoires." });
  }

const discordEmbed = {
    username: "Administration — Urgence Lilloise",
    avatar_url: "https://images-ext-1.discordapp.net/external/8aFZTPSGx86d0OrinnNccclsx-HM782VKGeEWOrsJd0/%3Fsize%3D256/https/cdn.discordapp.com/icons/1525134348842696825/2d0ad7849aa0c15ab794b22a214a4154.png?format=webp&quality=lossless",
    embeds: [{
      title: "DOSSIER DE CANDIDATURE — " + (service || 'GÉNÉRAL').toUpperCase(),
      color: 0x1E222B,
      thumbnail: {
        url: "https://images-ext-1.discordapp.net/external/8aFZTPSGx86d0OrinnNccclsx-HM782VKGeEWOrsJd0/%3Fsize%3D256/https/cdn.discordapp.com/icons/1525134348842696825/2d0ad7849aa0c15ab794b22a214a4154.png?format=webp&quality=lossless"
      },
      fields: [
        {
          name: "Identification Discord",
          value: "• **Compte :** `" + discordTag + "`\n• **ID :** `" + discordId + "`",
          inline: true
        },
        {
          name: "Informations IRL",
          value: "• **Prénom :** " + prenom + "\n• **Âge :** " + age + " ans",
          inline: true
        },
        {
          name: "\u200B",
          value: "\u200B",
          inline: false
        },
        {
          name: "Ambitions",
          value: "```\n" + (ambition || 'Non renseignée') + "\n```",
          inline: false
        },
        {
          name: "Motivations",
          value: "```\n" + motivation + "\n```",
          inline: false
        },
        {
          name: "Expériences Passées",
          value: "```\n" + (experience || 'Aucune expérience mentionnée.') + "\n```",
          inline: false
        },
        {
          name: "Vision du poste de Modérateur",
          value: "```\n" + (roleModerateur || 'Non renseigné') + "\n```",
          inline: false
        }
      ],
      footer: {
        text: "Urgence Lilloise — Système de Recrutement • Made by ymn_0ffcl"
      },
      timestamp: new Date()
    }]
  };

  try {
    await axios.post(DISCORD_WEBHOOK_URL, discordEmbed);
    return res.json({ success: true, message: "Candidature envoyée avec succès !" });
  } catch (err) {
    console.error("Erreur d'envoi Discord:", err);
    return res.status(500).json({ error: "Erreur lors de l'envoi vers Discord." });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
