// Storage helper for media / assets

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/media/${key}` };
}
