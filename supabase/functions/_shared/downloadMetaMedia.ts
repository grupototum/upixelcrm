// Download de mídia da Meta CDN + upload no Storage. Duplicado quase
// idêntico em whatsapp-webhook (Official), whatsapp-cloud-webhook e
// instagram-webhook; consolidado aqui.

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/aac": "aac",
  "video/mp4": "mp4", "application/pdf": "pdf",
};

/** Resolve o media_id da Graph API para a URL temporária de download. */
export async function resolveGraphMediaUrl(
  mediaId: string,
  accessToken: string,
  graphBase = "https://graph.facebook.com/v22.0",
): Promise<{ url: string; mimeType?: string } | null> {
  const res = await fetch(`${graphBase}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.url) return null;
  return { url: data.url, mimeType: data.mime_type };
}

/**
 * Baixa os bytes de `downloadUrl` e sobe no bucket `whatsapp_media`, com
 * prefixo por tenant (PC-038 — habilita policy de storage por client_id).
 * Devolve o PATH do objeto, não uma URL — quem renderiza assina na hora.
 */
export async function downloadAndStoreMetaMedia(
  adminClient: any,
  downloadUrl: string,
  mimetype: string,
  clientId: string,
  filePrefix: string,
  authToken?: string,
): Promise<string | null> {
  try {
    const res = await fetch(downloadUrl, authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : undefined);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());

    const cleanMime = (mimetype || "application/octet-stream").split(";")[0].trim();
    const ext = EXT_BY_MIME[cleanMime] ?? "bin";
    const fileName = `${clientId}/${filePrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await adminClient.storage.from("whatsapp_media")
      .upload(fileName, bytes, { contentType: cleanMime, upsert: false });
    if (error) { console.error("Storage upload error:", error); return null; }

    return fileName;
  } catch (err) {
    console.error("Error downloading/storing Meta media:", err);
    return null;
  }
}
