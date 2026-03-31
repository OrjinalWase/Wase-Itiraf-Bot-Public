import { Client, Events, GatewayIntentBits } from "discord.js";
import { registerCommands } from "./commands/registerCommands.js";
import { loadConfig } from "./config.js";
import { ConfessionService } from "./services/confessionService.js";
import { attachInteractionRouter } from "./services/interactionRouter.js";
import { PanelService } from "./services/panelService.js";
import { installPresenceRotator } from "./services/statusRotator.js";
import { DataStore } from "./storage/dataStore.js";

async function main() {
  const config = await loadConfig();
  const store = await new DataStore(config.dataFile).init();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
  });

  const panelService = new PanelService({ client, config, store });
  const confessionService = new ConfessionService({ client, config, store });

  attachInteractionRouter(client, {
    confessionService,
    panelService
  });

  client.once(Events.ClientReady, async (readyClient) => {
    console.log(`[READY] ${readyClient.user.tag} olarak giris yapildi.`);
    if (config.credits.showInConsole) {
      console.log(`[CREDITS] ${config.credits.signature}`);
    }

    await registerCommands(readyClient, config.guildId);
    installPresenceRotator(readyClient, config.presence);
    console.log("[COMMANDS] Slash komutlari guncellendi.");
  });

  client.on(Events.Warn, (warning) => {
    console.warn("[DISCORD_WARN]", warning);
  });

  client.on(Events.Error, (error) => {
    console.error("[DISCORD_ERROR]", error);
  });

  await client.login(config.token);
}

main().catch((error) => {
  console.error("[BOOT_ERROR]", error);
  process.exitCode = 1;
});
