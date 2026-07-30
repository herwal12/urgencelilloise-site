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
const TICKET_LOGS_CHANNEL_ID = '1531727851680698379';
const LOGO_URL = 'https://media.discordapp.net/attachments/1526171548472446986/1527347546618593441/logo-ul.png?ex=6a68d53f&is=6a6783bf&hm=41577189ad8d5c5fe693891bccd581b7b7623419699f2bfadf1822c1bec7443b&=&format=webp&quality=lossless';
const TICKET_BANNER_URL = 'https://media.discordapp.net/attachments/1530783984143962204/1532199713468841994/image.png?ex=6a6bfbae&is=6a6aaa2e&hm=f647b951b1389272d866ec5381b8fb42be9c70468ad5b1dc1e20f9eac077a586&=&format=webp&quality=lossless';
const SERVER_ICON_URL = 'https://images-ext-1.discordapp.net/external/13dVJvwLxmIyN952nvst_nHPVhRaOG98o5eg0L09rUw/%3Fsize%3D256/https/cdn.discordapp.com/icons/1530783981988085853/01bad94e7ccac907a3d138d7575b101a.png?format=webp&quality=lossless';

// Correspondance exacte des catégories avec LEURS RÔLES SPÉCIFIQUES
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

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_select_menu') {
        const selectedValue = interaction.values[0];
        const ticketInfo = TICKET_CATEGORIES[selectedValue];

        if (!ticketInfo) {
          return interaction.reply({ content: '❌ Erreur : Catégorie invalide.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        const user = interaction.user;
        const channelName = `${ticketInfo.name}-${user.username}`.toLowerCase().replace(/[^a-z0-9-_]/g, '');
        
        // Configuration stricte : @everyone bloque tout, le user et les rôles spécifiques ont les accès
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

        // Injection des rôles spécifiques de la catégorie
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
          lockPermissions: false // Ignore les restrictions de la catégorie parente pour forcer nos règles
        }).catch(err => {
          console.error("Erreur création salon:", err);
          return null;
        });

        if (!ticketChannel) {
          return interaction.editReply({ content: '❌ Impossible de créer le salon du ticket.' });
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

        // Construction dynamique du message de ping pour tous les rôles autorisés de la catégorie
        const pings = ticketInfo.allowedRoles.map(rId => `<@&${rId}>`).join(' ');
        await ticketChannel.send({ content: `${user} ${pings}`, embeds: [welcomeEmbed], components: [closeRow] });

        await interaction.editReply({ content: `✅ Votre ticket a été créé avec succès : ${ticketChannel}` });
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
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        return await interaction.showModal(modal);
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'modal_close_ticket') {
        const closeReason = interaction.fields.getTextInputValue('close_reason');
        await interaction.reply({ content: '🔒 Fermeture en cours...', ephemeral: true });

        const channel = interaction.channel;
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
