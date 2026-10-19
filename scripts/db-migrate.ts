import { openDatabase } from "../src/infrastructure/db/open";

const { db, path, migrations } = openDatabase();

try {
  if (migrations.applied.length === 0) {
    console.log(`Base à jour : ${path}`);
  } else {
    console.log(`Migrations appliquées sur ${path} :`);
    for (const migration of migrations.applied) {
      console.log(`  - ${migration}`);
    }
  }
} finally {
  db.close();
}
