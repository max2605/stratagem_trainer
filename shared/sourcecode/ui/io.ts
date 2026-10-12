import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { parsePack, validatePack, type Pack } from "../core";

declare global {
  interface Window {
    trainer?: { downloadPack: (url: string) => Promise<unknown> };
  }
}
export const MAX_BYTES = 1024 * 1024;
export async function downloadPack(raw: string): Promise<Pack> {
  const url = new URL(raw.trim());
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("httpsOnly");
  if (url.hostname === "github.com" && url.pathname.includes("/blob/")) {
    url.hostname = "raw.githubusercontent.com";
    url.pathname = url.pathname.replace("/blob/", "/");
  }
  if (window.trainer) {
    const data = await window.trainer.downloadPack(url.href);
    return typeof data === "string" ? parsePack(data) : validatePack(data);
  }
  if (Capacitor.isNativePlatform()) {
    const result = await CapacitorHttp.get({
      url: url.href,
      responseType: "text",
      connectTimeout: 15000,
      readTimeout: 15000,
    });
    if (result.status < 200 || result.status > 299)
      throw new Error(`HTTP ${result.status}`);
    return typeof result.data === "string"
      ? parsePack(result.data)
      : validatePack(result.data);
  }
  const response = await fetch(url.href, {
    signal: AbortSignal.timeout(15000),
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (Number(response.headers.get("content-length")) > MAX_BYTES)
    throw new Error("tooLarge");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("downloadFailed");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error("tooLarge");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return parsePack(new TextDecoder().decode(bytes));
}
export async function exportJSON(
  filename: string,
  data: unknown,
): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  if (Capacitor.isNativePlatform()) {
    const file = await Filesystem.writeFile({
      path: filename.replace(/[^a-zA-Z0-9_.-]/g, "_"),
      directory: Directory.Cache,
      data: content,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: filename,
      url: file.uri,
      dialogTitle: filename,
    });
  } else {
    const url = URL.createObjectURL(
      new Blob([content], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
export async function readFile(
  file: File,
  maxBytes = MAX_BYTES,
): Promise<string> {
  if (file.size > maxBytes) throw new Error("tooLarge");
  return file.text();
}
