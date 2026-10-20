const fs = require("fs");
const path = require("path");

function parseEnvFile(envPath) {
  const result = {};
  if (!fs.existsSync(envPath)) return result;
  const envContent = fs.readFileSync(envPath, "utf8");
  const lines = envContent.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1).trim();
    }
    result[key] = val;
  }
  return result;
}

function syncProvider(options = {}) {
  const envPath = options.envPath || path.join(__dirname, "..", ".env");
  const schemaPath = options.schemaPath || path.join(__dirname, "..", "prisma", "schema.prisma");
  const fileEnv = parseEnvFile(envPath);

  const dbUrl =
    options.databaseUrl !== undefined
      ? options.databaseUrl
      : process.env.DATABASE_URL !== undefined
      ? process.env.DATABASE_URL
      : fileEnv.DATABASE_URL;

  const directUrl =
    options.directUrl !== undefined
      ? options.directUrl
      : process.env.DIRECT_URL !== undefined
      ? process.env.DIRECT_URL
      : fileEnv.DIRECT_URL;

  if (!fs.existsSync(schemaPath)) {
    console.error("schema.prisma not found at", schemaPath);
    return null;
  }

  let schema = fs.readFileSync(schemaPath, "utf8");

  // Ensure generator client provider is always prisma-client-js
  schema = schema.replace(
    /generator\s+client\s+\{[\s\S]*?provider\s*=\s*"[^"]+"/,
    'generator client {\n  provider = "prisma-client-js"'
  );

  const isPostgres =
    Boolean(dbUrl) &&
    (dbUrl.startsWith("postgresql://") ||
      dbUrl.startsWith("postgres://") ||
      dbUrl.startsWith("prisma+postgres://"));
  const isSqlite =
    !dbUrl ||
    dbUrl.startsWith("file:") ||
    dbUrl.startsWith("sqlite:") ||
    !isPostgres;

  const targetProvider = isSqlite ? "sqlite" : "postgresql";
  const hasDirectUrl = targetProvider === "postgresql" && Boolean(directUrl && directUrl.trim());

  const datasourceBlock = hasDirectUrl
    ? `datasource db {\n  provider  = "postgresql"\n  url       = env("DATABASE_URL")\n  directUrl = env("DIRECT_URL")\n}`
    : `datasource db {\n  provider = "${targetProvider}"\n  url      = env("DATABASE_URL")\n}`;

  schema = schema.replace(/datasource\s+db\s+\{[\s\S]*?\}/, datasourceBlock);

  fs.writeFileSync(schemaPath, schema, "utf8");
  console.log(
    `[sync-db-provider] Prisma datasource provider set to '${targetProvider}'${
      hasDirectUrl ? " (with directUrl)" : ""
    } (DATABASE_URL: ${dbUrl ? dbUrl.replace(/:[^:@/]+@/, ":****@") : "default"})`
  );

  return { provider: targetProvider, hasDirectUrl, schema };
}

function patchNextBuildForWindows() {
  const nextBuildPath = path.join(__dirname, "..", "node_modules", "next", "dist", "build", "index.js");
  if (!fs.existsSync(nextBuildPath)) return;
  try {
    let content = fs.readFileSync(nextBuildPath, "utf8");
    let changed = false;

    // 1. Ensure directory exists before writeFileUtf8
    if (content.includes('async function writeFileUtf8(filePath, content) {\n    await _fs.promises.writeFile(filePath, content, "utf-8");\n}')) {
      content = content.replace(
        'async function writeFileUtf8(filePath, content) {\n    await _fs.promises.writeFile(filePath, content, "utf-8");\n}',
        'async function writeFileUtf8(filePath, content) {\n    await _fs.promises.mkdir(_path.default.dirname(filePath), { recursive: true });\n    await _fs.promises.writeFile(filePath, content, "utf-8");\n}'
      );
      changed = true;
    }

    // 2. Handle ENOENT when renaming static pages on Windows App Router
    if (content.includes('await _fs.promises.rename(orig, dest);') && !content.includes("err.code !== 'ENOENT'")) {
      content = content.replace(
        'await _fs.promises.rename(orig, dest);',
        "try {\n                                    await _fs.promises.rename(orig, dest);\n                                } catch (err) {\n                                    if (err.code !== 'ENOENT') throw err;\n                                }"
      );
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(nextBuildPath, content, "utf8");
      console.log("[sync-db-provider] Patched Next.js build for Windows file system safety.");
    }
  } catch (err) {
    // Gracefully ignore if read/write error
  }
}

if (require.main === module) {
  syncProvider();
  patchNextBuildForWindows();
}

module.exports = {
  syncProvider,
  patchNextBuildForWindows,
  parseEnvFile,
};

