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

// ==================== CONFIGURATION DISCORD & IDS ====================
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
    'ticket_question': { name: 'question', categoryId: '153221319963283712', title: 'Question', allowedRoles: ['1530783982197805117'] },
    'ticket_boutique': { name: 'boutique', categoryId: '1532213765431627816', title: 'Boutique', allowedRoles: ['1530783982210519235'] },
    'ticket_bug': { name: 'bug-ig', categoryId: '153221388597159442', title: 'Bug IG', allowedRoles: ['1530783982212203541'] },
    'ticket_legal': { name: 'legal', categoryId: '1532214069556281434', title: 'Légal', allowedRoles: ['1530783984709854339'] },
    'ticket_illegal': { name: 'illegal', categoryId: '1532214202343751780', title: 'Illégal', allowedRoles: ['1530701011029164252'] },
    'ticket_unban': { name: 'unban', categoryId: '1532214399945936896', title: 'Unban', allowedRoles: ['1530783982180896887', '1530783982180896886', '1530783982181794743'] },
    'ticket_plainte_joueur': { name: 'plainte-joueur', categoryId: '153221455990818999', title: 'Plainte Joueur', allowedRoles: ['1530783982197805117'] },
    'ticket_plainte': { name: 'plainte-staff', categoryId: '1532214697485537381', title: 'Plainte Staff', allowedRoles: ['1530783982210519236'] }
};

// Map pour suivre les tickets actifs en mémoire
const activeTickets = new Map();

// ==================== CONFIGURATION EXPRESS ====================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const applyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: "Trop de tentatives, veuillez réessayer plus tard." }
});

// ==================== ROUTES WEB ====================
app.get('/', (req, res) => res.render('index'));
app.get('/recrutement', (req, res) => res.render('recrutement'));
app.get('/boutique', (req, res) => res.render('boutique'));
app.get('/reglement', (req, res) => res.render('reglement'));

// Envoi de candidature depuis le site web
app.post('/recrutement', applyLimiter, async (req, res) => {
    try {
        const { poste, discordTag, discordId, prenom, age, pourquoiVous, experiences, roleModerateur } = req.body;
        
        // Récupération sécurisée du champ d'ambition selon le format transmis par le formulaire HTML
        const vosAmbitions = req.body.ambition || req.body['Vos ambitions dans notre staff'] || req.body['Vos ambitions'] || 'Aucune';

        const guild = client.guilds.cache.first();
        if (!guild) return res.status(500).json({ error: "Serveur Discord introuvable pour le bot." });

        const channel = await guild.channels.fetch(CANDIDATURE_DEST_CHANNEL_ID).catch(() => null);
        if (!channel) return res.status(500).json({ error: "Salon de destination des candidatures introuvable." });

        const postName = poste ? poste.toUpperCase() : 'MODÉRATION & SUPPORT';

        const embed = new EmbedBuilder()
            .setColor('#e52d48')
            .setTitle(`DOSSIER DE CANDIDATURE — ${postName}`)
            .setThumbnail(SERVER_ICON_URL)
            .addFields(
                { name: 'Identification Discord', value: `• **Compte :** \`${discordTag || 'Inconnu'}\`\n• **ID :** \`${discordId || 'Inconnu'}\``, inline: false },
                { name: 'Informations IRL', value: `• **Prénom :** ${prenom || 'Non renseigné'}\n• **Âge :** ${age || 'Non renseigné'} ans`, inline: false },
                { name: 'Vos ambitions dans notre staff', value: `\`\`\`text\n${vosAmbitions}\n\`\`\``, inline: false },
                { name: '🔥 INFORMATIONS : MOTIVATION', value: '----------------------------------------', inline: false },
                { name: 'Pourquoi vous et pas un autre ?', value: `\`\`\`text\n${pourquoiVous || 'Aucune'}\n\`\`\``, inline: false },
                { name: 'Vos expériences :', value: `\`\`\`text\n${experiences || 'Aucune'}\n\`\`\``, inline: false },
                { name: 'Dans vos mots, en quoi consiste le rôle d\'un modérateur ?', value: `\`\`\`text\n${roleModerateur || 'Aucune'}\n\`\`\``, inline: false },
                { name: 'Statut du Dossier', value: '⏳ **EN ATTENTE DE TRAITEMENT**', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Urgence Lilloise — Système de Recrutement', iconURL: LOGO_URL });

        const targetId = discordId ? discordId.replace(/[^0-9]/g, '') : 'unknown';

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`accept_${targetId}`).setLabel('Accepter').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`refuse_${targetId}`).setLabel('Refuser').setStyle(ButtonStyle.Danger)
        );

        const pingRoles = '<@&1530783982197805121> <@&1530783982210519232>';
        await channel.send({ content: `${pingRoles} 🔔 **Nouvelle candidature reçue !**`, embeds: [embed], components: [row] });
        
        res.status(200).json({ success: true, message: "Candidature envoyée avec succès !" });
    } catch (error) {
        console.error("Erreur lors de l'envoi de la candidature:", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
});

// ==================== CONFIGURATION DISCORD CLIENT ====================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', async () => {
    console.log(`🤖 Bot connecté en tant que ${client.user.tag}`);

    try {
        // Envoi automatique ou vérification du panel de tickets
        const ticketChannel = await client.channels.fetch(TICKET_CHANNEL_ID).catch(() => null);
        if (ticketChannel) {
            const messages = await ticketChannel.messages.fetch({ limit: 10 }).catch(() => null);
            const hasPanel = messages && messages.some(m => m.author.id === client.user.id && m.components.length > 0);

            if (!hasPanel) {
                const embed = newEmbedTicketPanel();
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('ticket_select_menu')
                    .setPlaceholder('Sélectionne ce que tu as besoin.')
                    .addOptions([
                        new StringSelectMenuOptionBuilder().setLabel('Question').setDescription('Une question générale').setValue('ticket_question').setEmoji('💬'),
                        new StringSelectMenuOptionBuilder().setLabel('Boutique').setDescription('Achat, paiement boutique').setValue('ticket_boutique').setEmoji('🛒'),
                        new StringSelectMenuOptionBuilder().setLabel('Bug IG').setDescription('Signaler un bug en jeu').setValue('ticket_bug').setEmoji('💢'),
                        new StringSelectMenuOptionBuilder().setLabel('Légal').setDescription('Reprise entreprise légale').setValue('ticket_legal').setEmoji('💵'),
                        new StringSelectMenuOptionBuilder().setLabel('Illégal').setDescription('Reprise de groupe illégal').setValue('ticket_illegal').setEmoji('💼'),
                        new StringSelectMenuOptionBuilder().setLabel('Unban').setDescription('Demande de débannissement').setValue('ticket_unban').setEmoji('🍓'),
                        new StringSelectMenuOptionBuilder().setLabel('Plainte Joueur').setDescription('Signaler un joueur').setValue('ticket_plainte_joueur').setEmoji('⚖️'),
                        new StringSelectMenuOptionBuilder().setLabel('Plainte Staff').setDescription('Signaler un staff').setValue('ticket_plainte').setEmoji('🚨'),
                    ]);
                const row = new ActionRowBuilder().addComponents(selectMenu);
                await ticketChannel.send({ embeds: [embed], components: [row] });
                console.log("✅ Panel de tickets initialisé automatiquement !");
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

// ==================== GESTION DES MESSAGES (COMMANDES TEXTES) ====================
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    // Commandes exécutables à l'intérieur d'un salon de ticket actif
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
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_select_menu')
                .setPlaceholder('Sélectionne ce que tu as besoin.')
                .addOptions([
                    new StringSelectMenuOptionBuilder().setLabel('Question').setDescription('Une question générale').setValue('ticket_question').setEmoji('💬'),
                    new StringSelectMenuOptionBuilder().setLabel('Boutique').setDescription('Achat, paiement boutique').setValue('ticket_boutique').setEmoji('🛒'),
                    new StringSelectMenuOptionBuilder().setLabel('Bug IG').setDescription('Signaler un bug en jeu').setValue('ticket_bug').setEmoji('💢'),
                    new StringSelectMenuOptionBuilder().setLabel('Légal').setDescription('Reprise entreprise légale').setValue('ticket_legal').setEmoji('💵'),
                    new StringSelectMenuOptionBuilder().setLabel('Illégal').setDescription('Reprise de groupe illégal').setValue('ticket_illegal').setEmoji('💼'),
                    new StringSelectMenuOptionBuilder().setLabel('Unban').setDescription('Demande de débannissement').setValue('ticket_unban').setEmoji('🍓'),
                    new StringSelectMenuOptionBuilder().setLabel('Plainte Joueur').setDescription('Signaler un joueur').setValue('ticket_plainte_joueur').setEmoji('⚖️'),
                    new StringSelectMenuOptionBuilder().setLabel('Plainte Staff').setDescription('Signaler un staff').setValue('ticket_plainte').setEmoji('🚨'),
                ]);
            const row = new ActionRowBuilder().addComponents(selectMenu);
            await message.channel.send({ embeds: [embed], components: [row] });
        } catch (err) {
            console.error("Erreur avec la commande !ticket :", err);
        }
    }
});

// ==================== GESTION DES INTERACTIONS ====================
client.on('interactionCreate', async interaction => {
    try {
        // Menu déroulant de sélection des tickets
        if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select_menu') {
            const selectedValue = interaction.values[0];
            const ticketInfo = TICKET_CATEGORIES[selectedValue];
            if (!ticketInfo) return interaction.reply({ content: '❌ Catégorie de ticket invalide.', ephemeral: true });

            await interaction.deferReply({ ephemeral: true });
            const guild = interaction.guild;
            const user = interaction.user;
            const channelName = `${ticketInfo.name}-${user.username}`.toLowerCase().replace(/[^a-z0-9-_]/g, '');

            const permissionOverwrites = [
                { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles] }
            ];

            if (ticketInfo.allowedRoles) {
                for (const roleId of ticketInfo.allowedRoles) {
                    permissionOverwrites.push({ id: roleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles] });
                }
            }

            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: ticketInfo.categoryId || null,
                permissionOverwrites: permissionOverwrites,
                lockPermissions: false
            }).catch(() => null);

            if (!ticketChannel) return interaction.editReply({ content: '❌ Erreur lors de la création du salon.' });

            activeTickets.set(ticketChannel.id, { userId: user.id, createdAt: Date.now() });

            const welcomeEmbed = new EmbedBuilder()
                .setColor('#e52d48')
                .setTitle(`Ticket : ${ticketInfo.title}`)
                .setDescription(`Bonjour ${user}, bienvenue dans votre ticket.\nUn membre du staff va prendre en charge votre demande dans les plus brefs délais.\n\nCliquez sur le bouton ci-dessous pour fermer le ticket lorsque votre problème est résolu.`)
                .setTimestamp();

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            const pings = ticketInfo.allowedRoles ? ticketInfo.allowedRoles.map(rId => `<@&${rId}>`).join(' ') : '';
            await ticketChannel.send({ content: `${user} ${pings}`, embeds: [welcomeEmbed], components: [closeRow] });
            await interaction.editReply({ content: `✅ Votre ticket a été créé avec succès : ${ticketChannel}` });
        }

        // Boutons (Candidatures & Fermeture de ticket)
        if (interaction.isButton()) {
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

            if (interaction.customId === 'close_ticket') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_close_ticket')
                    .setTitle('Fermeture du ticket');

                const reasonInput = new TextInputBuilder()
                    .setCustomId('close_reason')
                    .setLabel('Raison :')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                return await interaction.showModal(modal);
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
                    if (f.name === 'Statut du Dossier') {
                        return { name: 'Statut du Dossier', value: `❌ **REFUSÉ** par ${staffUser.tag}\n**Raison :** ${reason}`, inline: false };
                    }
                    return f;
                });

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
    console.error("❌ Erreur de connexion du Bot Discord :", err);
});

app.listen(PORT, () => {
    console.log(`🌐 Serveur web démarré sur le port ${PORT}`);
});
