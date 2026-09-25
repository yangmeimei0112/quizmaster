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

syncProvider();
patchNextBuildForWindows();
