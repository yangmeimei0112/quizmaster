const fs = require("fs");
const path = require("path");

function syncProvider() {
  const envPath = path.join(__dirname, "..", ".env");
  let dbUrl = process.env.DATABASE_URL;

  if (!dbUrl && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (match) {
      dbUrl = match[1].trim();
    }
  }

  const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
  if (!fs.existsSync(schemaPath)) {
    console.error("schema.prisma not found at", schemaPath);
    return;
  }

  let schema = fs.readFileSync(schemaPath, "utf8");

  // Ensure generator client provider is always prisma-client-js
  schema = schema.replace(
    /generator\s+client\s+\{[\s\S]*?provider\s*=\s*"[^"]+"/,
    'generator client {\n  provider = "prisma-client-js"'
  );

  const isSqlite = dbUrl && (dbUrl.startsWith("file:") || dbUrl.startsWith("sqlite:"));
  const targetProvider = isSqlite ? "sqlite" : "postgresql";

  // Replace provider inside datasource db block
  schema = schema.replace(
    /(datasource\s+db\s+\{[\s\S]*?provider\s*=\s*)"[^"]+"/,
    `$1"${targetProvider}"`
  );

  fs.writeFileSync(schemaPath, schema, "utf8");
  console.log(`[sync-db-provider] Prisma datasource provider set to '${targetProvider}' (DATABASE_URL: ${dbUrl || "default"})`);
}

syncProvider();
