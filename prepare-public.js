import fs from "fs";
import path from "path";

const webDir = path.resolve("02 - Web");
const publicDir = path.join(webDir, "public");

const filesToCopy = [
  {
    from: path.join(webDir, "assets", "js", "app.js"),
    to: path.join(publicDir, "assets", "js", "app.js")
  }
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(from, to) {
  if (!fs.existsSync(from)) {
    throw new Error(`Arquivo de origem não encontrado: ${from}`);
  }

  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
  console.log(`Copiado: ${from} -> ${to}`);
}

function removeFileIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
    console.log(`Removido: ${filePath}`);
  }
}

// Remove JSON aberto da pasta public para ele não ir para o dist.
removeFileIfExists(path.join(publicDir, "dados_troubleshooting.json"));

for (const file of filesToCopy) {
  copyFile(file.from, file.to);
}

console.log("Preparação da pasta public concluída.");