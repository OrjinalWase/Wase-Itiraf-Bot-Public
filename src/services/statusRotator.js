import { ActivityType } from "discord.js";

export function installPresenceRotator(client, presenceConfig) {
  const states = presenceConfig.states?.length ? presenceConfig.states : ["wase", "wase2", "wase3"];
  let index = 0;

  const applyStatus = () => {
    const name = states[index % states.length];
    client.user.setPresence({
      activities: [
        {
          name,
          type: ActivityType.Streaming,
          url: presenceConfig.twitchUrl
        }
      ],
      status: "online"
    });
    index += 1;
  };

  applyStatus();
  return setInterval(applyStatus, presenceConfig.rotateEverySeconds * 1000);
}
