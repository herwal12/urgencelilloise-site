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

// Map pour suivre les tickets actifs en mémoire
const activeTickets = new Map();

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

        const targetId = discordId ? discordId.replace(/[^0-9]/g, '') : 'unknown';

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`accept_${targetId}`).setLabel('Accepter').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`refuse_${targetId}`).setLabel('Refuser').setStyle(ButtonStyle.Danger)
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

// Gestion des messages (Commandes textuelles et !ticket)
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    // Commandes exécutables à l'intérieur d'un salon de ticket actif (.rename, .add, .del)
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
                await message.channel.permissionOverwrites.edit(targetMember.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
                return message.reply({ content: `✅ ${targetMember} a été ajouté au ticket.` });
            } catch (err) {
                return message.reply({ content: '❌ Erreur lors de l\'ajout du membre.' });
            }
        }

        if (command === '.del') {
            const targetMember = message.mentions.members.first();
            if (!targetMember) return message.reply({ content: '❌ Utilisation : `.del @membre`' });
            try {
                await message.channel.permissionOverwrites.edit(targetMember.id, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false });
                return message.reply({ content: `✅ L'accès au ticket a été retiré à ${targetMember}.` });
            } catch (err) {
                return message.reply({ content: '❌ Erreur lors du retrait du membre.' });
            }
        }
    }

    // Commande `!ticket` manuelle
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

// Interactions (Boutons, Menus Déroulants et Modales Discord)
client.on('interactionCreate', async interaction => {
    try {
        // Gestion du menu déroulant des tickets
        if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_menu_select') {
            const selectedKey = interaction.values[0];
            const categoryData = TICKET_CATEGORIES[selectedKey];

            if (!categoryData) {
                return interaction.reply({ content: '❌ Catégorie de ticket invalide.', ephemeral: true });
            }

            const guild = interaction.guild;
            const member = interaction.member;

            await interaction.deferReply({ ephemeral: true });

            // Création du salon privé
            const channelName = `ticket-${member.user.username}`.toLowerCase().replace(/[^a-z0-9]/g, '');
            const permissionOverwrites = [
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
                }
            ];

            if (categoryData.allowedRoles) {
                for (const roleId of categoryData.allowedRoles) {
                    permissionOverwrites.push({
                        id: roleId,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory,
                            PermissionsBitField.Flags.AttachFiles
                        ]
                    });
                }
            }

            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: categoryData.categoryId || null,
                permissionOverwrites: permissionOverwrites,
            }).catch(() => null);

            if (!ticketChannel) {
                return interaction.editReply({ content: '❌ Une erreur est survenue lors de la création du salon.' });
            }

            activeTickets.set(ticketChannel.id, { userId: member.id, createdAt: Date.now() });

            const welcomeEmbed = new EmbedBuilder()
                .setTitle(`🎫 Ticket : ${categoryData.name}`)
                .setDescription(`Bonjour ${member}, bienvenue dans votre ticket.\nUn membre du staff va prendre en charge votre demande dans les plus brefs délais.\n\nCliquez sur le bouton ci-dessous pour fermer le ticket lorsque votre problème est résolu.`)
                .setColor('#e52d48')
                .setTimestamp();

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            const pings = categoryData.allowedRoles ? categoryData.allowedRoles.map(rId => `<@&${rId}>`).join(' ') : '';
            await ticketChannel.send({ content: `${member} ${pings}`, embeds: [welcomeEmbed], components: [closeRow] });
            await interaction.editReply({ content: `✅ Votre ticket a été créé avec succès : ${ticketChannel}` });
        }

        // Gestion des boutons (Fermeture de ticket et Acceptation/Refus de candidatures)
        if (interaction.isButton()) {
            // Fermeture de ticket -> Ouvre la modale de motif
            if (interaction.customId === 'close_ticket') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_close_ticket')
                    .setTitle('Fermeture du ticket');

                const reasonInput = new TextInputBuilder()
                    .setCustomId('close_reason')
                    .setLabel('Raison de la fermeture :')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                return await interaction.showModal(modal);
            }

            // Candidatures : Accepter ou Refuser
            if (interaction.customId.startsWith('accept_') || interaction.customId.startsWith('refuse_')) {
                const [action, targetUserId] = interaction.customId.split('_');

                if (action === 'accept') {
                    await interaction.deferUpdate();
                    const staffUser = interaction.user;
                    const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]);

                    const acceptEmbed = new EmbedBuilder()
                        .setTitle("🪪 Recrutement")
                        .setDescription("Votre candidature a été **acceptée** ! Ouvrez un ticket sur le Discord principal.")
                        .setColor(0x2ED573)
                        .setThumbnail(LOGO_URL);

                    if (targetUserId && targetUserId !== 'unknown') {
                        const targetUser = await client.users.fetch(targetUserId).catch(() => null);
                        if (targetUser) await targetUser.send({ embeds: [acceptEmbed] }).catch(() => {});
                    }

                    const fields = originalEmbed.data.fields || [];
                    const updatedFields = fields.map(f => {
                        if (f.name === '📌 Statut' || f.name === 'Statut du Dossier') {
                            return { name: '📌 Statut', value: `✅ Acceptée par ${staffUser.tag}`, inline: false };
                        }
                        return f;
                    });

                    // Si le champ Statut n'existait pas encore dans les vieux messages
                    if (!fields.some(f => f.name === '📌 Statut')) {
                        updatedFields.push({ name: '📌 Statut', value: `✅ Acceptée par ${staffUser.tag}`, inline: false });
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

        // Soumission de Modales (Refus de candidature & Clôture de ticket)
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
                        return { name: '📌 Statut', value: `❌ Refusée par ${staffUser.tag}\n**Raison :** ${reason}`, inline: false };
                    }
                    return f;
                });

                if (!fields.some(f => f.name === '📌 Statut')) {
                    updatedFields.push({ name: '📌 Statut', value: `❌ Refusée par ${staffUser.tag}\n**Raison :** ${reason}`, inline: false });
                }

                originalEmbed.setColor(0xE52D48).setFields(updatedFields);
                await interaction.editReply({ embeds: [originalEmbed], components: [] });
            }

            if (interaction.customId === 'modal_close_ticket') {
                const reason = interaction.fields.getTextInputValue('close_reason');
                await interaction.reply({ content: `🔒 Fermeture du ticket demandée. Raison : *${reason}*\nSuppression du salon imminente...`, ephemeral: false });

                activeTickets.delete(interaction.channel.id);
                setTimeout(async () => {
                    await interaction.channel.delete().catch(() => {});
                }, 3000);
            }
        }
    } catch (err) {
        console.error("Erreur lors de la gestion d'une interaction :", err);
    }
});

// ==================== LANCEMENT DU SERVEUR ====================
client.login(DISCORD_BOT_TOKEN).catch(err => {
    console.error("❌ Erreur de connexion du Bot Discord : Vérifie ton token dans le code ou tes variables d'environnement.", err);
});

app.listen(PORT, () => {
    console.log(`🌐 Serveur web démarré sur le port ${PORT}`);
});
