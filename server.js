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

// ==================== MIDDLEWARES ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ==================== CONFIGURATION DISCORD ====================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ID du Bot et Salons
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

const RECRUTEMENT_CHANNEL_ID = '1530783982877278213';
const CANDIDATURE_DEST_CHANNEL_ID = '1530783985045606508';

const TICKET_CHANNEL_ID = '1530783984143962204';
const TICKET_LOGS_CHANNEL_ID = '1531727851680698379';

// Médias
const LOGO_URL = 'https://media.discordapp.net/attachments/1526171548472446986/1527347546618593441/logo-ul.png?ex=6a683df3&is=6a678bf&hm=41577189ada8d5c5fe693891bccd581b7623419699f2bfadf1822c1bec7443b&format=webp&quality=lossless';
const TICKET_BANNER_URL = 'https://media.discordapp.net/attachments/1530783984143962204/153219713468841994/image.png?ex=6a6bfbae&is=6a640e3b&hm=f647b951b138927d866ec5381b7842be9c70468ad5b1dc1e20f9eac077a586&format=webp&quality=lossless';
const SERVER_ICON_URL = 'https://images-ext-1.discordapp.net/external/13VDJVwLxmiY952nvst_nHPVhRaG98oSeg0L09rUw/%3Fsize%3D3256/https/cdn.discordapp.com/icons/1530783981988085583/01bad94e7cac907a3d138d7575b101a.png?format=webp&quality=lossless';

// Correspondance des catégories de tickets
const TICKET_CATEGORIES = {
    'ticket_question': { name: 'Question', categoryId: '153221319963283712', title: 'Question', allowedRoles: ['1530783982197805117'] },
    'ticket_boutique': { name: 'Boutique', categoryId: '1532213765431627816', title: 'Boutique', allowedRoles: ['1530783982210519235'] },
    'ticket_bug': { name: 'Bug IG', categoryId: '153221388597159442', title: 'Bug IG', allowedRoles: ['1530783982212203541'] },
    'ticket_legal': { name: 'Légal', categoryId: '1532214069556281434', title: 'Légal', allowedRoles: ['1530783984709854339'] },
    'ticket_illegal': { name: 'Illégal', categoryId: '1532214202343751780', title: 'Illégal', allowedRoles: ['1530701011029164252'] },
    'ticket_unban': { name: 'Unban', categoryId: '1532214399945936896', title: 'Unban', allowedRoles: ['1530783982180896887', '1530783982180896886', '1530783982181794743'] },
    'ticket_plainte_joueur': { name: 'Plainte Joueur', categoryId: '153221455990818999', title: 'Plainte Joueur', allowedRoles: ['1530783982197805117'] },
    'ticket_plainte': { name: 'Plainte Staff', categoryId: '1532214697485537381', title: 'Plainte Staff', allowedRoles: ['1530783982210519236'] }
};

// ==================== ROUTES WEB ====================
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/recrutement', (req, res) => {
    res.render('recrutement');
});

app.get('/boutique', (req, res) => {
    res.render('boutique');
});

app.get('/reglement', (req, res) => {
    res.render('reglement');
});

// Envoi de candidature depuis le site web
app.post('/recrutement', async (req, res) => {
    try {
        const { poste, discordTag, discordId, prenom, age, 'Vos ambitions dans notre staff': ambition, pourquoiVous, experiences, roleModerateur } = req.body;

        const guild = client.guilds.cache.first();
        if (!guild) return res.status(500).json({ error: "Serveur Discord introuvable pour le bot." });

        const channel = await guild.channels.fetch(CANDIDATURE_DEST_CHANNEL_ID);
        if (!channel) return res.status(500).json({ error: "Salon de destination des candidatures introuvable." });

        const embed = new EmbedBuilder()
            .setTitle(`📥 Nouvelle Candidature : ${poste || 'Modération'}`)
            .setColor('#e52d48')
            .setThumbnail(SERVER_ICON_URL)
            .addFields(
                { name: '👤 Pseudo Discord', value: discordTag || 'Non spécifié', inline: true },
                { name: '🆔 ID Discord', value: discordId || 'Non spécifié', inline: true },
                { name: '📌 Prénom / Âge', value: `${prenom || 'N/A'} (${age || 'N/A'} ans)`, inline: true },
                { name: '🎯 Vos ambitions dans notre staff', value: ambition || 'Aucune ambition renseignée' },
                { name: '🔥 Pourquoi vous ?', value: pourquoiVous || 'Non renseigné' },
                { name: '💼 Expériences', value: experiences || 'Aucune expérience mentionnée' },
                { name: '🛡️ Rôle d\'un modérateur', value: roleModerateur || 'Non renseigné' }
            )
            .setTimestamp()
            .setFooter({ text: 'Urgence Lilloise — Système de Recrutement', iconURL: LOGO_URL });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('accept_candidature').setLabel('Accepter').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('refuse_candidature').setLabel('Refuser').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ embeds: [embed], components: [row] });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Erreur lors de l'envoi de la candidature:", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

// ==================== ÉVÉNEMENTS DISCORD (BOT) ====================

client.once('ready', async () => {
    console.log(`🤖 Bot connecté en tant que ${client.user.tag}`);

    try {
        // Envoi automatique du panel de tickets si le salon est configuré
        const ticketChannel = await client.channels.fetch(TICKET_CHANNEL_ID).catch(() => null);
        if (ticketChannel) {
            const messages = await ticketChannel.messages.fetch({ limit: 10 }).catch(() => null);
            const hasPanel = messages && messages.some(m => m.author.id === client.user.id && m.components.length > 0);

            if (!hasPanel) {
                const embed = newEmbedTicketPanel();
                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('ticket_menu_select')
                        .setPlaceholder('📂 Sélectionnez le motif de votre ticket...')
                        .addOptions(
                            Object.keys(TICKET_CATEGORIES).map(key => 
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(TICKET_CATEGORIES[key].name)
                                    .setValue(key)
                                    .setDescription(`Ouvrir un ticket pour ${TICKET_CATEGORIES[key].name}`)
                            )
                        )
                );
                await ticketChannel.send({ embeds: [embed], components: [row] });
                console.log("✅ Panel de tickets envoyé avec succès !");
            }
        }
    } catch (e) {
        console.error("Impossible d'envoyer le panel de tickets au démarrage :", e);
    }
});

function newEmbedTicketPanel() {
    return new EmbedBuilder()
        .setTitle('🎫 Urgence Lilloise — Support & Tickets')
        .setDescription("Besoin d'aide, d'une information ou d'effectuer une réclamation ? Sélectionnez ci-dessous la catégorie qui correspond à votre demande pour ouvrir un ticket privé avec le staff.")
        .setColor('#e52d48')
        .setImage(TICKET_BANNER_URL)
        .setThumbnail(SERVER_ICON_URL)
        .setFooter({ text: 'Urgence Lilloise — Système de Support', iconURL: LOGO_URL });
}

// Commande texte `!ticket`
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    if (message.content === '!ticket') {
        try {
            await message.delete().catch(() => {});
            const embed = newEmbedTicketPanel();
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_menu_select')
                    .setPlaceholder('📂 Sélectionnez le motif de votre ticket...')
                    .addOptions(
                        Object.keys(TICKET_CATEGORIES).map(key => 
                            new StringSelectMenuOptionBuilder()
                                .setLabel(TICKET_CATEGORIES[key].name)
                                .setValue(key)
                                .setDescription(`Ouvrir un ticket pour ${TICKET_CATEGORIES[key].name}`)
                        )
                    )
            );
            await message.channel.send({ embeds: [embed], components: [row] });
        } catch (err) {
            console.error("Erreur avec la commande !ticket :", err);
        }
    }
});

// Interactions (Boutons et Menus Déroulants Discord)
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;

    // Gestion du menu déroulant des tickets
    if (interaction.customId === 'ticket_menu_select') {
        const selectedKey = interaction.values[0];
        const categoryData = TICKET_CATEGORIES[selectedKey];

        if (!categoryData) {
            return interaction.reply({ content: '❌ Catégorie de ticket invalide.', ephemeral: true });
        }

        const guild = interaction.guild;
        const member = interaction.member;

        try {
            await interaction.deferReply({ ephemeral: true });

            // Création du salon privé
            const channelName = `ticket-${member.user.username}`.toLowerCase().replace(/[^a-z0-9]/g, '');
            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: categoryData.categoryId || null,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: member.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory,
                            PermissionsBitField.Flags.AttachFiles
                        ],
                    },
                    ...categoryData.allowedRoles.map(roleId => ({
                        id: roleId,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory,
                            PermissionsBitField.Flags.AttachFiles
                        ]
                    }))
                ],
            });

            const welcomeEmbed = new EmbedBuilder()
                .setTitle(`🎫 Ticket : ${categoryData.name}`)
                .setDescription(`Bonjour ${member}, bienvenue dans votre ticket.\nUn membre du staff va prendre en charge votre demande dans les plus brefs délais.\n\nCliquez sur le bouton ci-dessous pour fermer le ticket lorsque votre problème est résolu.`)
                .setColor('#e52d48')
                .setTimestamp();

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            await ticketChannel.send({ content: `${member}`, embeds: [welcomeEmbed], components: [closeRow] });
            await interaction.editReply({ content: `✅ Votre ticket a été créé avec succès : ${ticketChannel}` });

        } catch (err) {
            console.error("Erreur lors de la création du salon ticket :", err);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Une erreur est survenue lors de la création du ticket.', ephemeral: true });
            } else {
                await interaction.editReply({ content: '❌ Une erreur est survenue lors de la création du ticket.' });
            }
        }
    }

    // Gestion du bouton de fermeture de ticket
    if (interaction.customId === 'close_ticket') {
        try {
            await interaction.reply({ content: '🔒 Fermeture du ticket en cours...', ephemeral: true });
            setTimeout(async () => {
                await interaction.channel.delete().catch(() => {});
            }, 3000);
        } catch (e) {
            console.error("Erreur lors de la fermeture du ticket :", e);
        }
    }

    // Gestion Acceptation / Refus de Candidatures
    if (interaction.customId === 'accept_candidature' || interaction.customId === 'refuse_candidature') {
        try {
            const isAccepted = interaction.customId === 'accept_candidature';
            const originalEmbed = interaction.message.embeds[0];
            
            const updatedEmbed = EmbedBuilder.from(originalEmbed)
                .setColor(isAccepted ? '#2ed573' : '#ff4757')
                .addFields({ 
                    name: '📌 Statut', 
                    value: `${isAccepted ? '✅ Acceptée' : '❌ Refusée'} par ${interaction.user.tag}` 
                });

            await interaction.update({ embeds: [updatedEmbed], components: [] });
        } catch (err) {
            console.error("Erreur lors du traitement de la candidature :", err);
        }
    }
});

// ==================== LANCEMENT DU SERVEUR ====================
client.login(DISCORD_BOT_TOKEN).catch(err => {
    console.error("❌ Erreur de connexion du Bot Discord : Vérifie ton token dans le code ou tes variables d'environnement.", err);
});

app.listen(PORT, () => {
    console.log(`🌐 Serveur web démarré sur le port ${PORT}`);
});
