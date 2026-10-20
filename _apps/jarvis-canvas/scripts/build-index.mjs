import { mkdir, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { readAndValidateContent, readAndValidateCollections, projectRoot } from './validate-content.mjs';

try {
  const artifacts = await readAndValidateContent();
  const collections = await readAndValidateCollections(projectRoot, artifacts);
  const outputDirectory = join(projectRoot, 'public', 'data');
  await mkdir(outputDirectory, { recursive: true });
  const output = join(outputDirectory, 'index.json');
  const generatedAt = new Date().toISOString();
  const body = JSON.stringify({ schemaVersion: 2, generatedAt, artifacts, collections }, null, 2) + '\n';
  // No absolute app URLs: the client loads ./data/index.json beneath its own Pages subpath.
  await writeFile(output + '.tmp', body, 'utf8');
  await rename(output + '.tmp', output);
  console.log(`已生成 public/data/index.json：${artifacts.length} 份条目，${collections.length} 个资料集。`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
