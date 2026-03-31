import { createCanvas } from "@napi-rs/canvas";
import {
  FONT_FAMILY,
  drawCircleImage,
  fillRoundedRect,
  hexToRgba,
  loadRemoteImage,
  strokeRoundedRect,
  wrapText
} from "./canvasTools.js";
import { truncate } from "../utils/format.js";

function drawFallbackBadge(ctx, centerX, centerY, radius, theme, label = null) {
  const gradient = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
  gradient.addColorStop(0, theme.accent);
  gradient.addColorStop(1, theme.accentSoft);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111626";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#edf6ff";
  ctx.textAlign = "center";

  if (label) {
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.max(16, radius - 4)}px "${FONT_FAMILY}"`;
    ctx.fillText(truncate(label.toUpperCase(), 2), centerX, centerY + 1);
    ctx.textBaseline = "top";
  } else {
    ctx.beginPath();
    ctx.arc(centerX, centerY - 10, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 16, 24, 17, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = "start";
}

function drawPill(ctx, x, y, label, fillStyle, textStyle) {
  ctx.save();
  ctx.font = `700 14px "${FONT_FAMILY}"`;
  const width = Math.max(108, Math.ceil(ctx.measureText(label).width + 30));
  fillRoundedRect(ctx, x, y, width, 34, 17, fillStyle);
  ctx.fillStyle = textStyle;
  ctx.fillText(label, x + 15, y + 9);
  ctx.restore();
  return width;
}

export async function renderPanelCard({ guildName, guildIconUrl, theme, panel }) {
  const width = 1100;
  const height = 420;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "top";

  const [guildImage, authorImage] = await Promise.all([
    loadRemoteImage(guildIconUrl),
    loadRemoteImage(panel.authorAvatarUrl)
  ]);

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#15182a");
  background.addColorStop(1, "#1f2842");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const topGlow = ctx.createRadialGradient(900, 72, 12, 900, 72, 320);
  topGlow.addColorStop(0, hexToRgba(theme.accentSoft, 0.25));
  topGlow.addColorStop(1, hexToRgba(theme.accentSoft, 0));
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, width, height);

  fillRoundedRect(ctx, 48, 44, width - 96, height - 88, 30, "rgba(9, 12, 23, 0.93)");
  strokeRoundedRect(ctx, 48, 44, width - 96, height - 88, 30, "rgba(255, 255, 255, 0.08)");

  const leftCard = { x: 82, y: 82, width: 514, height: 176 };
  const rightCard = { x: 620, y: 82, width: 282, height: 176 };

  fillRoundedRect(ctx, leftCard.x, leftCard.y, leftCard.width, leftCard.height, 22, "rgba(255, 255, 255, 0.05)");
  fillRoundedRect(ctx, rightCard.x, rightCard.y, rightCard.width, rightCard.height, 22, "rgba(255, 255, 255, 0.05)");
  strokeRoundedRect(ctx, rightCard.x, rightCard.y, rightCard.width, rightCard.height, 22, "rgba(255, 255, 255, 0.05)");

  const authorName = truncate((panel.authorName || guildName || "Panel").toUpperCase(), 18);
  const guildLabel = truncate((guildName || "Itiraf Sunucusu").toUpperCase(), 24);

  if (authorImage) {
    drawCircleImage(ctx, authorImage, 110, 112, 40);
  } else {
    drawFallbackBadge(ctx, 110, 112, 20, theme, authorName.slice(0, 1));
  }

  ctx.fillStyle = "#f2f6ff";
  ctx.font = `700 14px "${FONT_FAMILY}"`;
  ctx.fillText(authorName, 138, 89);

  ctx.fillStyle = "rgba(255, 255, 255, 0.52)";
  ctx.font = `500 12px "${FONT_FAMILY}"`;
  ctx.fillText("Paneli kuran kullanici", 138, 110);

  fillRoundedRect(ctx, 136, 142, 220, 26, 13, hexToRgba(theme.accent, 0.16));
  ctx.fillStyle = "#dce6ff";
  ctx.font = `700 12px "${FONT_FAMILY}"`;
  ctx.fillText(guildLabel, 150, 149);

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 52px "${FONT_FAMILY}"`;
  ctx.fillText(panel.panelTitle ?? theme.panelTitle, 96, 178);

  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  ctx.font = `700 17px "${FONT_FAMILY}"`;
  ctx.fillText("Hazir misin?", 96, 236);

  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
  ctx.font = `500 14px "${FONT_FAMILY}"`;
  const subtitleLines = wrapText(
    ctx,
    theme.panelSubtitle || "Anonim olarak paylas, toplulukla guvenli sekilde bulus.",
    470
  );
  subtitleLines.slice(0, 2).forEach((line, index) => {
    ctx.fillText(line, 96, 264 + index * 18);
  });

  ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
  ctx.font = `500 13px "${FONT_FAMILY}"`;
  const helperLines = wrapText(
    ctx,
    panel.description || "Butona tikla, kategorini sec ve itirafini anonim olarak gonder.",
    470
  );
  helperLines.slice(0, 1).forEach((line) => {
    ctx.fillText(line, 96, 308);
  });

  const activeGradient = ctx.createLinearGradient(0, 0, 164, 0);
  activeGradient.addColorStop(0, theme.accent);
  activeGradient.addColorStop(1, theme.accentSoft);
  let pillX = 96;
  const pillY = 338;
  pillX += drawPill(ctx, pillX, pillY, "Anonim Itiraf", activeGradient, "#0b1222") + 12;
  pillX += drawPill(ctx, pillX, pillY, "Hizli Gonderim", "rgba(255, 255, 255, 0.1)", "#ffffff") + 12;
  drawPill(ctx, pillX, pillY, "Mod Logu", "rgba(255, 255, 255, 0.1)", "#ffffff");

  const visualGlow = ctx.createRadialGradient(761, 132, 20, 761, 132, 180);
  visualGlow.addColorStop(0, hexToRgba(theme.accentSoft, 0.3));
  visualGlow.addColorStop(1, hexToRgba(theme.accentSoft, 0));
  ctx.fillStyle = visualGlow;
  ctx.fillRect(rightCard.x, rightCard.y, rightCard.width, rightCard.height);

  const visualSurface = ctx.createLinearGradient(
    rightCard.x,
    rightCard.y,
    rightCard.x + rightCard.width,
    rightCard.y + rightCard.height
  );
  visualSurface.addColorStop(0, "rgba(255, 255, 255, 0.02)");
  visualSurface.addColorStop(1, hexToRgba(theme.accentSoft, 0.08));
  fillRoundedRect(ctx, rightCard.x + 14, rightCard.y + 14, rightCard.width - 28, rightCard.height - 28, 18, visualSurface);

  ctx.save();
  ctx.shadowColor = hexToRgba(theme.accentSoft, 0.45);
  ctx.shadowBlur = 34;
  ctx.beginPath();
  ctx.arc(761, 134, 42, 0, Math.PI * 2);
  ctx.strokeStyle = hexToRgba(theme.accentSoft, 0.45);
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.restore();

  if (guildImage) {
    drawCircleImage(ctx, guildImage, 761, 134, 82);
  } else {
    drawFallbackBadge(ctx, 761, 134, 41, theme);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#f4f7ff";
  ctx.font = `700 18px "${FONT_FAMILY}"`;
  ctx.fillText(truncate(theme.brandName, 22), 761, 208);

  ctx.fillStyle = "rgba(255, 255, 255, 0.58)";
  ctx.font = `500 12px "${FONT_FAMILY}"`;
  ctx.fillText("Tikla, yaz ve anonim sekilde paylas.", 761, 232);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255, 255, 255, 0.54)";
  ctx.font = `500 13px "${FONT_FAMILY}"`;
  ctx.fillText(`#${truncate(theme.brandName, 20)}`, width - 76, 60);

  if (panel.signature) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    ctx.font = `500 12px "${FONT_FAMILY}"`;
    ctx.fillText(panel.signature, width - 76, height - 68);
  }

  ctx.textAlign = "start";
  return canvas.toBuffer("image/png");
}
