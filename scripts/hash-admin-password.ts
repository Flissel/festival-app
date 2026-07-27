import { randomBytes } from "node:crypto";
import { hashAdminPassword } from "@/lib/auth";

const password = process.argv[2];
if (!password) {
  console.error('Nutzung: npm run admin:hash -- "dein-passwort"');
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
console.log(hashAdminPassword(password, salt));
