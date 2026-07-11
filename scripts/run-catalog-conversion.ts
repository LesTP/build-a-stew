import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertCatalog, ConversionError } from './convert-catalog';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const csvPath = resolve(root, 'insta_the_pot_ingredients_v2.csv');
const outPath = resolve(root, 'src', 'ingredients.json');

try {
  const csv = readFileSync(csvPath, 'utf-8');
  const ingredients = convertCatalog(csv);
  writeFileSync(outPath, JSON.stringify(ingredients, null, 2) + '\n', 'utf-8');
  console.log(`Converted ${ingredients.length} ingredients → src/ingredients.json`);
} catch (e) {
  if (e instanceof ConversionError) {
    console.error('Conversion failed:', e.message);
    process.exit(1);
  }
  throw e;
}
