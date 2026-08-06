import type { NextFunction, Request, Response } from "express";
import { isIP } from "node:net";

const PRIVATE_IPV4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
];

export function requirePluginToken(req: Request, res: Response, next: NextFunction): void {
  const configured = process.env.PLUGIN_TOKEN?.trim();
  if (!configured) {
    res.status(503).json({ error: "PLUGIN_TOKEN is not configured" });
    return;
  }

  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token !== configured) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

export function assertPublicHttpsUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Некорректный URL изображения");
  }

  if (url.protocol !== "https:") {
    throw new Error("Изображение должно быть доступно по HTTPS");
  }

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) {
    throw new Error("Локальные адреса запрещены");
  }

  if (isIP(host) === 4 && PRIVATE_IPV4.some((pattern) => pattern.test(host))) {
    throw new Error("Приватные IP-адреса запрещены");
  }

  const allowlist = (process.env.ALLOWED_IMAGE_HOSTS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (
    allowlist.length > 0 &&
    !allowlist.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
  ) {
    throw new Error("Домен изображения отсутствует в ALLOWED_IMAGE_HOSTS");
  }

  return url;
}
