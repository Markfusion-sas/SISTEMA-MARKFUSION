import type { Credential } from "@/types/database";

export type CredentialRow = Credential & {
  client: { id: string; nombre: string; empresa: string | null } | null;
};
