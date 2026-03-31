import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const internalConfig = {
  theme: {
    brandName: "Wase Confessions",
    panelTitle: "Itiraf Paneli",
    panelSubtitle: "Anonim olarak paylas, toplulukla guvenli sekilde bulus.",
    accent: "#7c9cff",
    accentSoft: "#3fd6ff",
    backgroundA: "#151726",
    backgroundB: "#1f273f"
  },
  credits: {
    developerName: "Wase",
    signature: "Gelistiren: Wase",
    showOnCards: true,
    showInConsole: true
  },
  panel: {
    buttonLabel: "Itiraf Et",
    description: "Butona dokun, kategorini sec ve itirafini anonim olarak gonder.",
    enforceReadOnlyPermissions: false
  },
  presence: {
    rotateEverySeconds: 20,
    twitchUrl: "https://twitch.tv/wase",
    states: ["wase", "wase2", "wase3"]
  },
  confession: {
    maxLength: 700,
    commentMaxLength: 250,
    reportMaxLength: 300,
    anonymousComments: false,
    categories: ["Iliskiler", "Sunucu", "Gunluk", "Gundem", "Kisi"]
  }
};

const requiredConfigPlaceholders = {
  token: "BOT_TOKEN_BURAYA",
  guildId: "SUNUCU_ID_BURAYA",
  panelChannelId: "PANEL_KANAL_ID_BURAYA",
  confessionChannelId: "ITIRAF_KANAL_ID_BURAYA",
  logChannelId: "LOG_KANAL_ID_BURAYA"
};

function requireConfiguredString(config, key) {
  const value = config[key];

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Zorunlu config alani eksik veya gecersiz: ${key}`);
  }

  if (value === requiredConfigPlaceholders[key]) {
    throw new Error(`config/config.json icindeki \`${key}\` alani halen placeholder durumda.`);
  }
}

function requireSnowflake(config, key) {
  const value = config[key];

  if (!/^\d{16,20}$/.test(value)) {
    throw new Error(`config/config.json icindeki \`${key}\` alani gecerli bir Discord ID olmali.`);
  }
}

export async function loadConfig() {
  const configPath = join(projectRoot, "config", "config.json");
  let rawConfig;

  try {
    rawConfig = await readFile(configPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("config/config.json bulunamadi. Bu dosyayi olusturup token ve kanal ID'lerini doldur.");
    }

    throw error;
  }

  const parsedConfig = JSON.parse(rawConfig);
  const config = {
    token: parsedConfig.token,
    guildId: parsedConfig.guildId,
    panelChannelId: parsedConfig.panelChannelId,
    confessionChannelId: parsedConfig.confessionChannelId,
    logChannelId: typeof parsedConfig.logChannelId === "string" ? parsedConfig.logChannelId.trim() : "",
    theme: internalConfig.theme,
    credits: internalConfig.credits,
    panel: internalConfig.panel,
    presence: internalConfig.presence,
    confession: internalConfig.confession
  };

  requireConfiguredString(config, "token");
  requireConfiguredString(config, "guildId");
  requireConfiguredString(config, "panelChannelId");
  requireConfiguredString(config, "confessionChannelId");
  requireConfiguredString(config, "logChannelId");
  requireSnowflake(config, "guildId");
  requireSnowflake(config, "panelChannelId");
  requireSnowflake(config, "confessionChannelId");
  requireSnowflake(config, "logChannelId");

  config.rootDir = projectRoot;
  config.dataFile = join(projectRoot, "data", "confessions.json");
  config.presence.rotateEverySeconds = Math.max(5, Number(config.presence.rotateEverySeconds) || 20);
  config.confession.maxLength = Math.max(200, Number(config.confession.maxLength) || 700);
  config.confession.commentMaxLength = Math.max(80, Number(config.confession.commentMaxLength) || 250);
  config.confession.reportMaxLength = Math.max(80, Number(config.confession.reportMaxLength) || 300);
  config.confession.categories = Array.from(
    new Set((config.confession.categories ?? []).map((item) => String(item).trim()).filter(Boolean))
  ).slice(0, 25);

  return config;
}
