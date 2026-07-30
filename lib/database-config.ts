const MONGODB_SCHEME = /^mongodb(?:\+srv)?:\/\//i;

export function normalizeMongoUri(value: string | undefined): string {
  const uri = value?.trim() ?? "";
  if (!uri || /[<>]/.test(uri) || !MONGODB_SCHEME.test(uri)) return "";

  try {
    return new URL(uri).hostname ? uri : "";
  } catch {
    return "";
  }
}

export function resolveMongoUri(primary: string | undefined, fallback: string | undefined): string {
  return normalizeMongoUri(primary) || normalizeMongoUri(fallback);
}
