import fs from "fs";
import path from "path";
import JavaScriptObfuscator from "javascript-obfuscator";

const distDir = path.resolve("dist");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!fullPath.endsWith(".js")) {
      continue;
    }

    const originalCode = fs.readFileSync(fullPath, "utf8");

    const obfuscationResult = JavaScriptObfuscator.obfuscate(originalCode, {
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.35,
      deadCodeInjection: false,
      debugProtection: false,
      disableConsoleOutput: false,
      identifierNamesGenerator: "hexadecimal",
      renameGlobals: false,
      rotateStringArray: true,
      selfDefending: false,
      simplify: true,
      splitStrings: false,
      stringArray: true,
      stringArrayEncoding: ["base64"],
      stringArrayThreshold: 0.75,
      unicodeEscapeSequence: false
    });

    fs.writeFileSync(fullPath, obfuscationResult.getObfuscatedCode(), "utf8");
    console.log(`Ofuscado: ${path.relative(distDir, fullPath)}`);
  }
}

if (!fs.existsSync(distDir)) {
  console.error("Pasta dist não encontrada. Rode npm run build primeiro.");
  process.exit(1);
}

walk(distDir);
console.log("Ofuscação concluída.");