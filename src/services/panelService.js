import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits
} from "discord.js";
import { renderPanelCard } from "../renderers/panelCard.js";

function buildPanelComponents(config) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confession:start")
        .setLabel(config.panel.buttonLabel)
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🕶️")
    )
  ];
}

export class PanelService {
  constructor({ client, config, store }) {
    this.client = client;
    this.config = config;
    this.store = store;
  }

  async publishPanel(author = null) {
    const channel = await this.client.channels.fetch(this.config.panelChannelId);
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new Error("Panel kanali bulunamadi veya yazi kanali degil.");
    }

    if (this.config.panel.enforceReadOnlyPermissions && channel.permissionsFor(channel.guild.members.me)?.has(PermissionFlagsBits.ManageChannels)) {
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
        SendMessages: false
      });
    }

    const imageBuffer = await renderPanelCard({
      guildName: channel.guild.name,
      guildIconUrl: channel.guild.iconURL({ extension: "png", size: 256 }),
      theme: this.config.theme,
      panel: {
        panelTitle: this.config.theme.panelTitle,
        description: this.config.panel.description,
        signature: this.config.credits.showOnCards ? this.config.credits.signature : "",
        authorName: author?.globalName || author?.username || channel.guild.name,
        authorAvatarUrl: author?.displayAvatarURL?.({ extension: "png", size: 256, forceStatic: true }) ?? null
      }
    });

    const payload = {
      files: [new AttachmentBuilder(imageBuffer, { name: "itiraf-paneli.png" })],
      components: buildPanelComponents(this.config)
    };

    const panelState = this.store.getPanelState();

    if (panelState.panelChannelId === channel.id && panelState.panelMessageId) {
      try {
        const existingMessage = await channel.messages.fetch(panelState.panelMessageId);
        await existingMessage.edit(payload);
        return existingMessage;
      } catch {
        // Mesaj silinmisse asagida tekrar yollariz.
      }
    }

    const sentMessage = await channel.send(payload);
    await this.store.setPanelMessage(channel.id, sentMessage.id);
    return sentMessage;
  }
}
