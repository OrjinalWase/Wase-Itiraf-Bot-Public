import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  ThreadAutoArchiveDuration,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import { renderConfessionCard } from "../renderers/confessionCard.js";
import { truncate } from "../utils/format.js";

const FREE_CATEGORY_VALUE = "__free__";
const LOG_COLORS = {
  confession: 0x57f287,
  comment: 0x5865f2,
  report: 0xed4245
};

function metrics(confession) {
  return {
    up: confession.votes.up.length,
    down: confession.votes.down.length,
    comments: confession.comments.length
  };
}

function buildConfessionContent(confession) {
  const values = metrics(confession);
  return `Itiraf #${confession.id} | 👍 ${values.up} | 👎 ${values.down} | 💬 ${values.comments}`;
}

function buildMessageUrl(guildId, channelId, messageId) {
  if (!guildId || !channelId || !messageId) {
    return "";
  }

  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

function normalizeLogText(text, maxLength = 1000) {
  const normalized = String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return truncate(normalized || "-", maxLength);
}

function buildUserField(user) {
  return `@${user.username}\n\`${user.id}\``;
}

async function deferEphemeral(interaction) {
  if (interaction.deferred || interaction.replied) {
    return;
  }

  await interaction.deferReply({ ephemeral: true });
}

async function respondEphemeral(interaction, payload) {
  const replyPayload = {
    ephemeral: true,
    ...payload
  };

  if (interaction.deferred) {
    const { ephemeral, ...editPayload } = replyPayload;
    return interaction.editReply(editPayload);
  }

  if (interaction.replied) {
    return interaction.followUp(replyPayload);
  }

  return interaction.reply(replyPayload);
}

function buildCommentContent(config, interaction, message) {
  const authorLabel = config.confession.anonymousComments ? "Anonim" : interaction.user.username;
  const normalizedMessage = message.trim() || "-";

  if (normalizedMessage.includes("\n")) {
    return `${authorLabel}:\n${normalizedMessage}`;
  }

  return `${authorLabel}: ${normalizedMessage}`;
}

function buildConfessionButtons(confession) {
  const values = metrics(confession);

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confession:vote-up:${confession.id}`)
        .setLabel(`Begen - ${values.up}`)
        .setStyle(ButtonStyle.Success)
        .setEmoji("👍"),
      new ButtonBuilder()
        .setCustomId(`confession:vote-down:${confession.id}`)
        .setLabel(`Begenme - ${values.down}`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("👎"),
      new ButtonBuilder()
        .setCustomId(`confession:comment:${confession.id}`)
        .setLabel("Yorum Yap")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("💬"),
      new ButtonBuilder()
        .setCustomId(`confession:report:${confession.id}`)
        .setLabel("Raporla")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🚩")
    )
  ];
}

function buildCategorySelect(config) {
  const options = config.confession.categories.map((category, index) => ({
    label: category,
    description: `${category} kategorisinde anonim itiraf gonder.`,
    value: String(index)
  }));

  options.push({
    label: "Serbest",
    description: "Kategori secmeden devam et.",
    value: FREE_CATEGORY_VALUE
  });

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("confession:category")
      .setPlaceholder("Kategori seciniz")
      .addOptions(options)
  );
}

function buildConfessionModal(config, categoryValue) {
  const categoryIndex = Number(categoryValue);
  const categoryName =
    categoryValue === FREE_CATEGORY_VALUE ? "Serbest" : config.confession.categories[categoryIndex] || "Serbest";

  return new ModalBuilder()
    .setCustomId(`confession:submit:${categoryValue}`)
    .setTitle(`Itiraf Gonder - ${truncate(categoryName, 20)}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("confessionTitle")
          .setLabel("Kisa Baslik")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(60)
          .setRequired(false)
          .setPlaceholder("Ornek: Icimi dokmek istedim")
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("confessionContent")
          .setLabel("Itirafini yaz")
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(config.confession.maxLength)
          .setRequired(true)
          .setPlaceholder("Buraya anonim olarak paylasmak istedigin metni yaz.")
      )
    );
}

function buildCommentModal(config, confessionId) {
  return new ModalBuilder()
    .setCustomId(`confession:comment-submit:${confessionId}`)
    .setTitle(`Yorum Yap - #${confessionId}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("commentText")
          .setLabel("Yorumun")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(config.confession.commentMaxLength)
          .setPlaceholder("Yorumun anonim olarak paylasilsin.")
      )
    );
}

function buildReportModal(config, confessionId) {
  return new ModalBuilder()
    .setCustomId(`confession:report-submit:${confessionId}`)
    .setTitle(`Raporla - #${confessionId}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("reportReason")
          .setLabel("Rapor Nedeni")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(config.confession.reportMaxLength)
          .setPlaceholder("Bu gonderiyi neden raporladigini kisaca yaz.")
      )
    );
}

export class ConfessionService {
  constructor({ client, config, store }) {
    this.client = client;
    this.config = config;
    this.store = store;
  }

  async handleCommand(interaction, panelService) {
    if (interaction.commandName !== "panel-kur") {
      return false;
    }

    const hasPermission = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
    if (!hasPermission) {
      await interaction.reply({
        content: "Bu komutu kullanmak icin `Sunucuyu Yonet` yetkisine sahip olmalisin.",
        ephemeral: true
      });
      return true;
    }

    await deferEphemeral(interaction);
    const message = await panelService.publishPanel(interaction.user);
    const creditsText = this.config.credits.showOnCards
      ? `Imza: ${this.config.credits.developerName}`
      : "Imza kapali";

    await respondEphemeral(interaction, {
      content: `Panel hazir. Kanal: <#${message.channelId}> | Mesaj: ${message.id} | ${creditsText}`,
    });

    return true;
  }

  async handleButton(interaction) {
    if (interaction.customId === "confession:start") {
      if (this.config.confession.categories.length) {
        await interaction.reply({
          content: "Lutfen itiraf kategorini sec. Ardindan modal acilacak.",
          components: [buildCategorySelect(this.config)],
          ephemeral: true
        });
        return true;
      }

      await interaction.showModal(buildConfessionModal(this.config, FREE_CATEGORY_VALUE));
      return true;
    }

    const [scope, action, rawId] = interaction.customId.split(":");
    if (scope !== "confession") {
      return false;
    }

    if (action === "vote-up" || action === "vote-down") {
      const direction = action === "vote-up" ? "up" : "down";
      const confession = await this.store.toggleVote(rawId, interaction.user.id, direction);
      if (!confession) {
        await interaction.reply({
          content: "Bu itiraf kaydi bulunamadi.",
          ephemeral: true
        });
        return true;
      }

      await interaction.update({
        content: buildConfessionContent(confession),
        components: buildConfessionButtons(confession)
      });

      return true;
    }

    if (action === "comment") {
      await interaction.showModal(buildCommentModal(this.config, rawId));
      return true;
    }

    if (action === "report") {
      await interaction.showModal(buildReportModal(this.config, rawId));
      return true;
    }

    return false;
  }

  async handleSelect(interaction) {
    if (interaction.customId !== "confession:category") {
      return false;
    }

    const categoryValue = interaction.values[0] ?? FREE_CATEGORY_VALUE;
    await interaction.showModal(buildConfessionModal(this.config, categoryValue));
    return true;
  }

  async handleModal(interaction) {
    if (interaction.customId.startsWith("confession:submit:")) {
      const categoryValue = interaction.customId.split(":").at(-1);
      await this.#publishConfession(interaction, categoryValue);
      return true;
    }

    if (interaction.customId.startsWith("confession:comment-submit:")) {
      const confessionId = interaction.customId.split(":").at(-1);
      await this.#publishComment(interaction, confessionId);
      return true;
    }

    if (interaction.customId.startsWith("confession:report-submit:")) {
      const confessionId = interaction.customId.split(":").at(-1);
      await this.#reportConfession(interaction, confessionId);
      return true;
    }

    return false;
  }

  async #publishConfession(interaction, categoryValue) {
    await deferEphemeral(interaction);

    const confessionChannel = await this.client.channels.fetch(this.config.confessionChannelId);
    if (!confessionChannel || confessionChannel.type !== ChannelType.GuildText) {
      throw new Error("Itiraf kanali bulunamadi veya yazi kanali degil.");
    }

    const category =
      categoryValue === FREE_CATEGORY_VALUE
        ? "Serbest"
        : this.config.confession.categories[Number(categoryValue)] || "Serbest";

    const title = interaction.fields.getTextInputValue("confessionTitle").trim();
    const content = interaction.fields.getTextInputValue("confessionContent").trim();

    const confession = await this.store.createConfession({
      authorId: interaction.user.id,
      title,
      category,
      content
    });

    try {
      const imageBuffer = renderConfessionCard({
        confession,
        theme: this.config.theme,
        signature: this.config.credits.showOnCards ? this.config.credits.signature : ""
      });

      const sentMessage = await confessionChannel.send({
        content: buildConfessionContent(confession),
        files: [new AttachmentBuilder(imageBuffer, { name: `itiraf-${confession.id}.png` })],
        components: buildConfessionButtons(confession)
      });

      await this.store.attachPublicMessage(confession.id, confessionChannel.id, sentMessage.id);
      await this.#sendLogEntry({
        title: "Yeni Itiraf Yayinlandi",
        color: LOG_COLORS.confession,
        url: buildMessageUrl(interaction.guildId, sentMessage.channelId, sentMessage.id),
        fields: [
          { name: "Itiraf ID", value: `#${confession.id}`, inline: true },
          { name: "Kategori", value: category, inline: true },
          { name: "Gonderen", value: buildUserField(interaction.user), inline: true },
          { name: "Baslik", value: normalizeLogText(title || "Yok", 180), inline: false },
          { name: "Mesaj", value: normalizeLogText(content, 1000), inline: false }
        ]
      });

      await respondEphemeral(interaction, {
        content: `Itirafin anonim olarak gonderildi. Yayin ID: #${confession.id}`
      });
    } catch (error) {
      await this.store.removeConfession(confession.id);
      throw error;
    }
  }

  async #publishComment(interaction, confessionId) {
    await deferEphemeral(interaction);

    const confession = this.store.getConfession(confessionId);
    if (!confession) {
      await respondEphemeral(interaction, {
        content: "Yorum eklenmek istenen itiraf bulunamadi."
      });
      return;
    }

    const commentMessage = interaction.fields.getTextInputValue("commentText").trim();
    const targetChannel = await this.client.channels.fetch(confession.publicChannelId);
    if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
      throw new Error("Yorum hedef kanali bulunamadi.");
    }

    const publicMessage = await targetChannel.messages.fetch(confession.publicMessageId);
    const commentThread = await this.#ensureCommentThread(confession, publicMessage);

    await commentThread.send({
      content: buildCommentContent(this.config, interaction, commentMessage),
      allowedMentions: { parse: [] }
    });

    const updatedConfession = await this.store.addComment(confessionId, {
      authorId: interaction.user.id,
      message: commentMessage
    });
    const freshConfession = updatedConfession ?? confession;


    await publicMessage.edit({
      content: buildConfessionContent(freshConfession),
      components: buildConfessionButtons(freshConfession)
    });

    await this.#sendLogEntry({
      title: "Yeni Anonim Yorum",
      color: LOG_COLORS.comment,
      url: buildMessageUrl(interaction.guildId, freshConfession.publicChannelId, freshConfession.publicMessageId),
      fields: [
        { name: "Itiraf ID", value: `#${confessionId}`, inline: true },
        { name: "Yazan", value: buildUserField(interaction.user), inline: true },
        {
          name: "Yayin Kanali",
          value: freshConfession.publicChannelId ? `<#${freshConfession.publicChannelId}>` : "Bilinmiyor",
          inline: true
        },
        {
          name: "Alt Baslik",
          value: freshConfession.commentThreadId ? `<#${freshConfession.commentThreadId}>` : "Olusturulamadi",
          inline: true
        },
        { name: "Yorum", value: normalizeLogText(commentMessage, 1000), inline: false }
      ]
    });

    await respondEphemeral(interaction, {
      content: "Yorumun alt basliga gonderildi."
    });
  }

  async #ensureCommentThread(confession, publicMessage) {
    if (confession.commentThreadId) {
      const existingThread = await this.client.channels.fetch(confession.commentThreadId).catch(() => null);
      if (existingThread?.isThread?.()) {
        if (existingThread.archived && !existingThread.locked) {
          await existingThread.setArchived(false, "Itiraf yorumu icin yeniden acildi.").catch(() => null);
        }

        return existingThread;
      }
    }

    const thread = await publicMessage.startThread({
      name: `Itiraf #${confession.id} Yorumlari`,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
      reason: `Itiraf #${confession.id} yorumlari icin otomatik alt baslik.`
    });

    await this.store.attachCommentThread(confession.id, thread.id);
    return thread;
  }

  async #reportConfession(interaction, confessionId) {
    await deferEphemeral(interaction);

    const reason = interaction.fields.getTextInputValue("reportReason").trim();
    const { confession, alreadyReported } = await this.store.addReport(confessionId, interaction.user.id, reason);

    if (!confession) {
      await respondEphemeral(interaction, {
        content: "Raporlanmak istenen itiraf bulunamadi."
      });
      return;
    }

    if (alreadyReported) {
      await respondEphemeral(interaction, {
        content: "Bu itirafi daha once raporlamissin."
      });
      return;
    }

    await this.#sendLogEntry({
      title: "Itiraf Raporu",
      color: LOG_COLORS.report,
      url: buildMessageUrl(interaction.guildId, confession.publicChannelId, confession.publicMessageId),
      fields: [
        { name: "Itiraf ID", value: `#${confessionId}`, inline: true },
        { name: "Raporlayan", value: buildUserField(interaction.user), inline: true },
        {
          name: "Durum",
          value: confession.publicMessageId ? "Yayinda" : "Baglantili mesaj bulunamadi",
          inline: true
        },
        { name: "Neden", value: normalizeLogText(reason, 1000), inline: false }
      ]
    });

    await respondEphemeral(interaction, {
      content: "Raporun moderasyon log kanalina iletildi."
    });
  }

  async #sendLogEntry({ title, color, fields, url }) {
    if (!this.config.logChannelId) {
      return;
    }

    try {
      const logChannel = await this.client.channels.fetch(this.config.logChannelId);
      if (!logChannel || logChannel.type !== ChannelType.GuildText) {
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setFooter({ text: `${this.config.theme.brandName} • Moderasyon Logu` })
        .setTimestamp(new Date())
        .addFields(
          fields.slice(0, 25).map((field) => ({
            name: normalizeLogText(field.name, 256),
            value: normalizeLogText(field.value, 1024),
            inline: Boolean(field.inline)
          }))
        );

      const components = [];

      if (url) {
        components.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel("Yayini Ac")
              .setStyle(ButtonStyle.Link)
              .setURL(url)
          )
        );
      }

      await logChannel.send({
        embeds: [embed],
        components,
        allowedMentions: { parse: [] }
      });
    } catch {
      // Log kanali hatasi ana akis icin engelleyici olmasin.
    }
  }
}
