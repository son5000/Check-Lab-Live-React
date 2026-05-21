const fs = require('fs').promises;
const path = require('path');
const ts = require('typescript');

async function ensureDir(dir){
  await fs.mkdir(dir, { recursive: true });
}

function isBinaryFile(name){
  const binExt = ['.png','.jpg','.jpeg','.gif','.webp','.ico','.mp4','.webm','.map','.wasm','.otf','.woff','.woff2','.ttf'];
  return binExt.includes(path.extname(name).toLowerCase());
}

function countBraces(text) {
  let count = 0;
  for (const ch of text) {
    if (ch === '{') count += 1;
    if (ch === '}') count -= 1;
  }
  return count;
}

function removeTypeDeclarations(content) {
  const lines = content.split('\n');
  const output = [];
  let skipping = false;
  let braceDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!skipping) {
      if (/^import\s+type\b/.test(trimmed)) {
        continue;
      }

      if (/^(export\s+)?type\s+\w+\s*=/.test(trimmed) || /^(export\s+)?interface\s+\w+/.test(trimmed)) {
        skipping = true;
        braceDepth = countBraces(line);
        if (braceDepth <= 0 && /;\s*$/.test(line)) {
          skipping = false;
        }
        continue;
      }
    } else {
      braceDepth += countBraces(line);
      if (braceDepth <= 0 && /;\s*$/.test(line)) {
        skipping = false;
      }
      continue;
    }

    output.push(line);
  }

  return output.join('\n');
}

function transformTypescript(content, ext){
  const result = ts.transpileModule(content, {
    compilerOptions: {
      jsx: ext === '.tsx' ? ts.JsxEmit.Preserve : ts.JsxEmit.None,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: false,
      noEmitHelpers: true,
      removeComments: false,
    },
    fileName: ext,
  });

  return result.outputText.replace(/\r\n/g, '\n');
}

async function copyAndTransform(srcRoot, destRoot){
  async function walk(dir){
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for(const e of entries){
      const srcPath = path.join(dir, e.name);
      const rel = path.relative(srcRoot, srcPath);
      const destPath = path.join(destRoot, rel);

      if(e.isDirectory()){
        if(['node_modules','.git','.next','dist'].includes(e.name)) continue;
        await ensureDir(destPath);
        await walk(srcPath);
        continue;
      }

      const lower = e.name.toLowerCase();
      if (lower === 'next-env.d.ts' || lower === 'tsconfig.json') {
        continue;
      }
      if(lower.endsWith('.d.ts')) continue;

      if(isBinaryFile(e.name)){
        await ensureDir(path.dirname(destPath));
        await fs.copyFile(srcPath, destPath);
        console.log('copied binary', rel);
        continue;
      }

      let content = await fs.readFile(srcPath, 'utf8');

      const ext = path.extname(e.name).toLowerCase();
      if(ext === '.ts' || ext === '.tsx'){
        content = transformTypescript(content, ext);
        const newExt = ext === '.tsx' ? '.jsx' : '.js';
        const destPathWithExt = destPath.slice(0, -ext.length) + newExt;
        await ensureDir(path.dirname(destPathWithExt));
        await fs.writeFile(destPathWithExt, content, 'utf8');
        console.log('converted', rel, '->', path.relative(destRoot, destPathWithExt));
        continue;
      }

      await ensureDir(path.dirname(destPath));
      await fs.writeFile(destPath, content, 'utf8');
      console.log('copied', rel);
    }
  }
  await walk(srcRoot);
}

async function main(){
  const src = process.argv[2];
  const dest = process.argv[3];
  if(!src || !dest){
    console.error('Usage: node convert-ts-to-js-fixed.js <source-root> <dest-root>');
    process.exit(1);
  }
  const absSrc = path.resolve(src);
  const absDest = path.resolve(dest);
  console.log('Source:', absSrc);
  console.log('Dest:', absDest);
  await copyAndTransform(absSrc, absDest);
  console.log('Done.');
}

main().catch(err=>{console.error(err); process.exit(2);});
