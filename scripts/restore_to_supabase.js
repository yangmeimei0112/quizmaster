/**
 * scripts/restore_to_supabase.js
 * Alias wrapper for scripts/migrate_to_supabase.js to support both CLI entrypoints.
 */

const { migrateFromBackup } = require("./migrate_to_supabase.js");

if (require.main === module) {
  migrateFromBackup().catch((err) => {
    console.error("[Restore] Migration failed:", err);
    process.exit(1);
  });
}

module.exports = {
  migrateFromBackup,
};
