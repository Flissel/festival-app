// Prisma meldet eine verletzte Eindeutigkeit als Fehlercode P2002. Der Typ des
// Fehlers hängt an der generierten Client-Version, deshalb hier eine bewusst
// schmale Prüfung auf die Form statt eines instanceof.
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

// Ein Update auf einen Datensatz, den es (mehr) nicht gibt — etwa weil er
// zwischen Lesen und Schreiben gelöscht wurde.
export function isRecordNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2025"
  );
}
