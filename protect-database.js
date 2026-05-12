import fs from "fs";
import path from "path";

const inputPath = path.resolve("02 - Web", "dados_troubleshooting.json");
const outputDir = path.resolve("src-tauri", "resources");
const outputPath = path.join(outputDir, "troubleshooting_base.dat");

// Esta chave precisa ser igual à chave usada no Rust.
// Não é criptografia forte, mas impede leitura direta do JSON.
const key = Uint8Array.from([
  0x57, 0x4f, 0x4c, 0x46, 0x2d, 0x54, 0x52, 0x42,
  0x2d, 0x32, 0x43, 0x2d, 0x39, 0x41, 0x37, 0x31,
  0x5f, 0x74, 0x65, 0x6c, 0x65, 0x6d, 0x65, 0x74,
  0x72, 0x69, 0x61, 0x5f, 0x77, 0x6f, 0x6c, 0x66
]);

function xorBuffer(buffer, keyBytes) {
  const output = Buffer.alloc(buffer.length);

  for (let i = 0; i < buffer.length; i += 1) {
    const keyByte = keyBytes[i % keyBytes.length];
    const positionByte = (i * 31 + 17) & 0xff;
    output[i] = buffer[i] ^ keyByte ^ positionByte;
  }

  return output;
}

if (!fs.existsSync(inputPath)) {
  throw new Error(`Arquivo JSON de origem não encontrado: ${inputPath}`);
}

const jsonText = fs.readFileSync(inputPath, "utf8");

// Valida se o arquivo de origem realmente é JSON antes de proteger.
JSON.parse(jsonText);

fs.mkdirSync(outputDir, { recursive: true });

const inputBuffer = Buffer.from(jsonText, "utf8");
const protectedBuffer = xorBuffer(inputBuffer, key);

fs.writeFileSync(outputPath, protectedBuffer);

console.log(`Base protegida gerada em: ${outputPath}`);
console.log(`Tamanho original: ${inputBuffer.length} bytes`);
console.log(`Tamanho protegido: ${protectedBuffer.length} bytes`);