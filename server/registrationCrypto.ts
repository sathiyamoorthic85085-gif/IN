import crypto from "node:crypto";

const algorithm = "aes-256-gcm";

function keyMaterials() {
  const secrets = [
    process.env.REGISTRATION_ENCRYPTION_SECRET,
    process.env.COOKIE_SECRET,
    process.env.SESSION_SECRET,
    process.env.JWT_SECRET,
  ].filter((value): value is string => Boolean(value));
  const uniqueSecrets = Array.from(new Set(secrets));
  if (!uniqueSecrets.length) throw new Error("Registration encryption is not configured");
  return uniqueSecrets.map((secret) => crypto.createHash("sha256").update(`innohack26-registration:${secret}`).digest());
}

export function encryptRegistrationValue(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, keyMaterials()[0], iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptRegistrationValue(payload: string) {
  const [ivPart, tagPart, ciphertextPart] = payload.split(".");
  if (!ivPart || !tagPart || !ciphertextPart) throw new Error("Malformed registration ciphertext");
  let lastError: unknown;
  for (const key of keyMaterials()) {
    try {
      const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(ivPart, "base64url"));
      decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
      return Buffer.concat([decipher.update(Buffer.from(ciphertextPart, "base64url")), decipher.final()]).toString("utf8");
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Unable to decrypt registration ciphertext");
}

export function transactionFingerprint(transactionId: string) {
  return transactionFingerprints(transactionId)[0];
}

export function transactionFingerprints(transactionId: string) {
  const normalised = transactionId.normalize("NFKC").replace(/[\u200B-\u200D\u2060\uFEFF]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
  const variants = Array.from(new Set([normalised, normalised.replace(/\s+/g, "")]));
  return keyMaterials().flatMap((key) => variants.map((variant) => crypto.createHmac("sha256", key).update(variant).digest("hex")));
}
