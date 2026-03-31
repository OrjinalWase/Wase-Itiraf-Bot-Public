import { createCanvas } from "@napi-rs/canvas";
import {
  FONT_FAMILY,
  fillRoundedRect,
  hexToRgba,
  strokeRoundedRect,
  wrapText
} from "./canvasTools.js";
import { formatDate, truncate } from "../utils/format.js";

export function renderConfessionCard({ confession, theme, signature }) {
  const width = 1080;
  const height = 540;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#111524");
  background.addColorStop(1, "#1b2237");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(920, 90, 14, 920, 90, 260);
  glow.addColorStop(0, hexToRgba(theme.accentSoft, 0.24));
  glow.addColorStop(1, hexToRgba(theme.accentSoft, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  fillRoundedRect(ctx, 46, 38, width - 92, height - 76, 30, "rgba(9, 12, 21, 0.9)");
  strokeRoundedRect(ctx, 46, 38, width - 92, height - 76, 30, "rgba(255, 255, 255, 0.06)");

  fillRoundedRect(ctx, 82, 82, 136, 30, 15, hexToRgba(theme.accent, 0.18));
  fillRoundedRect(ctx, 230, 82, 148, 30, 15, "rgba(255, 255, 255, 0.08)");

  ctx.fillStyle = "#eef5ff";
  ctx.font = `700 14px "${FONT_FAMILY}"`;
  ctx.fillText(`#${confession.id.toString().padStart(3, "0")} ITIRAF`, 100, 102);
  ctx.fillText(truncate((confession.category || "Serbest").toUpperCase(), 16), 250, 102);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255, 255, 255, 0.48)";
  ctx.font = `500 14px "${FONT_FAMILY}"`;
  ctx.fillText(`#${truncate(theme.brandName, 20)}`, width - 88, 102);
  ctx.textAlign = "start";

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 46px "${FONT_FAMILY}"`;
  ctx.fillText(`Itiraf #${confession.id}`, 82, 166);

  const title = truncate(confession.title || "Anonim Paylasim", 42);
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.font = `600 28px "${FONT_FAMILY}"`;
  ctx.fillText(title, 82, 212);

  ctx.fillStyle = "rgba(255, 255, 255, 0.56)";
  ctx.font = `500 15px "${FONT_FAMILY}"`;
  ctx.fillText("Anonim olarak gonderildi ve topluluga acildi.", 82, 240);

  fillRoundedRect(ctx, 82, 270, width - 164, 164, 24, "rgba(255, 255, 255, 0.045)");
  strokeRoundedRect(ctx, 82, 270, width - 164, 164, 24, "rgba(255, 255, 255, 0.04)");

  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.font = `500 30px "${FONT_FAMILY}"`;
  const contentLines = wrapText(ctx, confession.content, width - 236).slice(0, 5);
  contentLines.forEach((line, index) => {
    ctx.fillText(line, 112, 324 + index * 38);
  });

  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = `500 16px "${FONT_FAMILY}"`;
  ctx.fillText(formatDate(confession.createdAt), 84, 478);
  ctx.textAlign = "right";
  ctx.fillText("Oy ver, yorum yap veya raporla.", width - 86, 478);

  if (signature) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    ctx.font = `500 12px "${FONT_FAMILY}"`;
    ctx.fillText(signature, width - 86, 500);
  }

  ctx.textAlign = "start";
  return canvas.toBuffer("image/png");
}
