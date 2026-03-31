import { GlobalFonts, loadImage } from "@napi-rs/canvas";

const FONT_CANDIDATES = [
  "DejaVu Sans",
  "Segoe UI",
  "Arial",
  "Liberation Sans",
  "Noto Sans",
  "Fira Sans",
  "Adwaita Sans"
];

export const FONT_FAMILY = FONT_CANDIDATES.find((family) => GlobalFonts.has?.(family)) || "sans-serif";

export function hexToRgba(hex, alpha = 1) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized
        .split("")
        .map((char) => char + char)
        .join("")
    : normalized;

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function roundedRectPath(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

export function fillRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
  ctx.save();
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
}

export function strokeRoundedRect(ctx, x, y, width, height, radius, strokeStyle, lineWidth = 1) {
  ctx.save();
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
}

export function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const trial = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth) {
      currentLine = trial;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = word;
      continue;
    }

    lines.push(word);
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export async function loadRemoteImage(url) {
  if (!url) {
    return null;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return await loadImage(Buffer.from(arrayBuffer));
  } catch {
    return null;
  }
}

export function drawCircleImage(ctx, image, centerX, centerY, size) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(image, centerX - size / 2, centerY - size / 2, size, size);
  ctx.restore();
}
