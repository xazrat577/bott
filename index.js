const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  Events
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const TOKEN = process.env.TOKEN;

const APPLY_CHANNEL = "1484227572173897871";
const REQUEST_CHANNEL = "1484233071623671839";
const LOG_CHANNEL = "1466126456215310444";

let pending = new Set();

const roles = {
  gov: { name: "🏛 Правительство", id: "1465025782366601357" },
  fsb: { name: "🛡 ФСБ", id: "1465025783402598637" },
  gibdd: { name: "🚓 ГИБДД", id: "1465025785839620187" },
  umvd: { name: "👮 УМВД", id: "1465025784052842680" },
  army: { name: "🎖 Воинская часть", id: "1465025788473508117" },
  hospital: { name: "🏥 Больница", id: "1465025790415732829" },
  smi: { name: "📰 СМИ", id: "1465025794316173434" },
  arz: { name: "🔫 Арзамасское ОПГ", id: "1465025796426170621" },
  lyt: { name: "🔫 Лыткаринское ОПГ", id: "1465025799504789665" },
  bat: { name: "🔫 Батыровское ОПГ", id: "1465025798028267662" }
};

client.once('ready', async () => {
  console.log(`Бот запущен как ${client.user.tag}`);

  const channel = await client.channels.fetch(APPLY_CHANNEL);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('gov').setLabel('🏛 Правительство').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('fsb').setLabel('🛡 ФСБ').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('gibdd').setLabel('🚓 ГИБДД').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('umvd').setLabel('👮 УМВД').setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('army').setLabel('🎖 Воинская часть').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('hospital').setLabel('🏥 Больница').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('smi').setLabel('📰 СМИ').setStyle(ButtonStyle.Primary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('arz').setLabel('🔫 Арзамасское ОПГ').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('lyt').setLabel('🔫 Лыткаринское ОПГ').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('bat').setLabel('🔫 Батыровское ОПГ').setStyle(ButtonStyle.Danger)
  );

  const removeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('remove_role').setLabel('❌ Снять роль').setStyle(ButtonStyle.Secondary)
  );

  await channel.send({
    content: "📋 Выберите роль и отправьте заявку:",
    components: [row1, row2, row3, removeRow]
  });
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  if (pending.has(interaction.user.id) && roles[interaction.customId]) {
    return interaction.reply({
      content: "⏳ У тебя уже есть заявка на рассмотрении!",
      ephemeral: true
    });
  }

  if (roles[interaction.customId]) {
    const role = roles[interaction.customId];
    pending.add(interaction.user.id);

    const channel = await client.channels.fetch(REQUEST_CHANNEL);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept_${interaction.user.id}_${role.id}`)
        .setLabel('✅ Одобрить')
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`deny_${interaction.user.id}`)
        .setLabel('❌ Отклонить')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `⏳ Заявка от <@${interaction.user.id}>\nРоль: ${role.name}`,
      components: [row]
    });

    interaction.user.send(`📨 Ты подал заявку на роль: ${role.name}`).catch(() => {});

    await interaction.reply({
      content: `⏳ Заявка отправлена: ${role.name}`,
      ephemeral: true
    });
  }

  if (interaction.customId.startsWith("accept_")) {
    const [_, userId, roleId] = interaction.customId.split("_");
    const admin = interaction.user;

    const member = await interaction.guild.members.fetch(userId);

    let roleName = "Неизвестно";
    for (let key in roles) {
      if (roles[key].id === roleId) roleName = roles[key].name;
    }

    await member.roles.add(roleId);
    pending.delete(userId);

    member.send(`✅ Твоя заявка одобрена! Роль: ${roleName}`).catch(() => {});

    await interaction.channel.send(
      `✅ Одобрено!\n👮 Админ: <@${admin.id}>\n👤 Игрок: <@${userId}>\n🎭 Роль: ${roleName}`
    );

    const logChannel = await client.channels.fetch(LOG_CHANNEL);
    await logChannel.send(
      `📊 ЛОГ\nАдмин: <@${admin.id}>\nИгрок: <@${userId}>\nРоль: ${roleName}`
    );

    await interaction.reply({ content: "✅ Готово", ephemeral: true });
  }

  if (interaction.customId.startsWith("deny_")) {
    const userId = interaction.customId.split("_")[1];
    const admin = interaction.user;

    pending.delete(userId);

    const member = await interaction.guild.members.fetch(userId);

    member.send(`❌ Твоя заявка отклонена`).catch(() => {});

    await interaction.channel.send(
      `❌ Отклонено!\n👮 Админ: <@${admin.id}>\n👤 Игрок: <@${userId}>`
    );

    const logChannel = await client.channels.fetch(LOG_CHANNEL);
    await logChannel.send(
      `📊 ЛОГ ОТКАЗ\nАдмин: <@${admin.id}>\nИгрок: <@${userId}>`
    );

    await interaction.reply({ content: "❌ Готово", ephemeral: true });
  }

  if (interaction.customId === "remove_role") {
    const member = await interaction.guild.members.fetch(interaction.user.id);

    let removed = false;

    for (let key in roles) {
      if (member.roles.cache.has(roles[key].id)) {
        await member.roles.remove(roles[key].id);
        removed = true;
      }
    }

    if (removed) {
      interaction.reply({ content: "❌ Все роли сняты", ephemeral: true });
    } else {
      interaction.reply({ content: "⚠️ У тебя нет ролей", ephemeral: true });
    }
  }
});

client.login(TOKEN);
