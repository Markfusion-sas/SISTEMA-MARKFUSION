import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifrado de las contraseñas de Accesos (solo en el servidor).
 * AES-256-GCM con la llave CREDENTIALS_ENCRYPTION_KEY (32 bytes en base64),
 * que vive en las variables de entorno y nunca en la base de datos.
 * Formato guardado: "v1.<iv>.<tag>.<datos>" (cada parte en base64).
 */

const VERSION = "v1";

function getKey() {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  try {
    const key = Buffer.from(raw, "base64");
    return key.length === 32 ? key : null;
  } catch {
    return null;
  }
}

/** true si la llave de cifrado está configurada y es válida. */
export function isCryptoConfigured() {
  return getKey() !== null;
}

export function encryptSecret(plain: string) {
  const key = getKey();
  if (!key) throw new Error("Falta configurar CREDENTIALS_ENCRYPTION_KEY");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), data.toString("base64")].join(".");
}

export function decryptSecret(stored: string) {
  const key = getKey();
  if (!key) throw new Error("Falta configurar CREDENTIALS_ENCRYPTION_KEY");
  const [version, iv, tag, data] = stored.split(".");
  if (version !== VERSION || !iv || !tag || !data) throw new Error("Formato de contraseña cifrada no válido");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
