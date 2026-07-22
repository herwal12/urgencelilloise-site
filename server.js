require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const applyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: "Trop de candidatures. Réessaie dans 15 minutes."
});

// Page d'accueil
app.get('/', async (req, res) => {
    let serverStats = { online: false, playersCount: 0, maxPlayers: 64 };

    try {
        const response = await axios.get(`http://${process.env.FIVEM_IP}/dynamic.json`, { timeout: 2500 });
        if (response.data) {
            serverStats.online = true;
            serverStats.playersCount = response.data.clients;
            serverStats.maxPlayers = response.data.sv_maxclients;
        }
    } catch (error) {
        console.log("Serveur FiveM non joignable.");
    }

    res.render('index', { 
        stats: serverStats, 
        fivemIp: process.env.FIVEM_IP,
        discordUrl: process.env.DISCORD_INVITE_URL 
    });
});
// Page de règlement
app.get('/reglement', (req, res) => {
  res.render('reglement');
});
// Page de recrutement
app.get('/recrutement', (req, res) => {
    res.render('recrutement', { 
        discordUrl: process.env.DISCORD_INVITE_URL,
        message: null,
        error: null
    });
});

// Envoi vers Discord
app.post('/recrutement', applyLimiter, async (req, res) => {
    const { discordTag, age, service, experience, motivation } = req.body;

    if (!discordTag || !age || !service || !motivation) {
        return res.render('recrutement', {
            discordUrl: process.env.DISCORD_INVITE_URL,
            message: null,
            error: "Veuillez remplir tous les champs obligatoires."
        });
    }

    const discordEmbed = {
        embeds: [{
            title: "🚨 NOUVELLE CANDIDATURE REÇUE",
            color: service.includes('Police') ? 3447003 : (service.includes('Pompiers') ? 15158332 : 15844367),
            fields: [
                { name: "👤 Pseudo Discord", value: discordTag, inline: true },
                { name: "🎂 Âge", value: `${age} ans`, inline: true },
                { name: "🛡️ Service", value: service, inline: true },
                { name: "📜 Expérience", value: experience || "Aucune" },
                { name: "📝 Motivations", value: motivation }
            ],
            footer: { text: "Urgence Lilloise RP - Recrutement Web" },
            timestamp: new Date()
        }]
    };

    try {
        await axios.post(process.env.DISCORD_WEBHOOK_URL, discordEmbed);
        res.render('recrutement', {
            discordUrl: process.env.DISCORD_INVITE_URL,
            message: "Candidature envoyée avec succès au staff !",
            error: null
        });
    } catch (err) {
        res.render('recrutement', {
            discordUrl: process.env.DISCORD_INVITE_URL,
            message: null,
            error: "Erreur lors de l'envoi vers Discord."
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Site lancé sur http://localhost:${PORT}`);
});
