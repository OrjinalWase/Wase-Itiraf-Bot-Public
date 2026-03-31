import { Events } from "discord.js";

export function attachInteractionRouter(client, { confessionService, panelService }) {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        await confessionService.handleCommand(interaction, panelService);
        return;
      }

      if (interaction.isButton()) {
        await confessionService.handleButton(interaction);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        await confessionService.handleSelect(interaction);
        return;
      }

      if (interaction.isModalSubmit()) {
        await confessionService.handleModal(interaction);
      }
    } catch (error) {
      console.error("[INTERACTION_ERROR]", error);

      const payload = {
        content: "Islem sirasinda bir hata olustu. Lutfen tekrar dene veya log kanalini kontrol et.",
        ephemeral: true
      };

      if (interaction.deferred || interaction.replied) {
        if (interaction.deferred) {
          const { ephemeral, ...editPayload } = payload;
          await interaction.editReply(editPayload).catch(() => null);
        } else {
          await interaction.followUp(payload).catch(() => null);
        }
      } else {
        await interaction.reply(payload).catch(() => null);
      }
    }
  });
}
