import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export async function registerCommands(client, guildId) {
  const commands = [
    new SlashCommandBuilder()
      .setName("panel-kur")
      .setDescription("Itiraf panelini ayarli kanala yollar veya gunceller.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  ];

  const guild = await client.guilds.fetch(guildId);
  await guild.commands.set(commands.map((command) => command.toJSON()));
}
