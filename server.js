require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "https://discord.com/api/webhooks/1530410092753850541/lIfyUFXJlvChEaEaK_5W85P-gVU_eBypFNKBTuoWWyKItS9w8N49RGBm0iNJhX4kD6EFI";

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
        return res.status(400).json({ error: "Veuillez remplir tous les champs obligatoires." });
    }

    const discordEmbed = {
        username: "Recrutement Urgence Lilloise",
        avatar_url: "https://media.discordapp.net/attachments/1490687935509430293/1529274485063028807/logo.png",
        embeds: [{
            title: `📩 NOUVELLE CANDIDATURE — ${service.toUpperCase()}`,
            color: 15019336,
            fields: [
                { name: "👤 Pseudo Discord", value: discordTag, inline: true },
                { name: "🎂 Âge", value: `${age} ans`, inline: true },
                { name: "💼 Poste visé", value: service, inline: true },
                { name: "📜 Expérience", value: experience || "Aucune" },
                { name: "📝 Motivations", value: motivation }
            ],
            footer: { text: "Urgence Lilloise Semi FivePD — Made by ymn_0ffcl" },
            timestamp: new Date()
        }]
    };

    try {
        await axios.post(DISCORD_WEBHOOK_URL, discordEmbed);
        res.json({ success: true, message: "Candidature envoyée avec succès !" });
    } catch (err) {
        console.error("Erreur d'envoi Discord:", err);
        res.status(500).json({ error: "Erreur lors de l'envoi vers Discord." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Site lancé sur http://localhost:${PORT}`);
});
