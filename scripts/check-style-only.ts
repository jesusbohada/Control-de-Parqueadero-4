/**
 * Comprueba que un cambio en un componente .tsx toca SOLO estilos (atributos className).
 * Uso: npx tsx scripts/check-style-only.ts <archivo.tsx> [ref-git=HEAD]
 * Compara la versión de <ref> con la del disco tras neutralizar todos los className.
 * Sale con código 1 y muestra las diferencias si cambió algo más (lógica, textos, props).
 */
import ts from 'typescript';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [file, ref = 'HEAD'] = process.argv.slice(2);
if (!file) {
  console.error('Uso: npx tsx scripts/check-style-only.ts <archivo.tsx> [ref-git]');
  process.exit(2);
}

function normalize(source: string): string {
  const sf = ts.createSourceFile('x.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const transformer: ts.TransformerFactory<ts.SourceFile> = (ctx) => {
    const visit = (node: ts.Node): ts.Node => {
      if (ts.isJsxAttribute(node) && node.name.getText(sf) === 'className') {
        return ts.factory.updateJsxAttribute(node, node.name, ts.factory.createStringLiteral('§'));
      }
      return ts.visitEachChild(node, visit, ctx);
    };
    return (root) => ts.visitNode(root, visit) as ts.SourceFile;
  };
  const out = ts.transform(sf, [transformer]).transformed[0];
  return ts.createPrinter({ removeComments: true }).printFile(out);
}

const before = normalize(execFileSync('git', ['show', `${ref}:${file.replace(/\\/g, '/')}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
const after = normalize(readFileSync(file, 'utf8'));

if (before === after) {
  console.log(`OK: ${file} solo cambia estilos (className) respecto a ${ref}.`);
  process.exit(0);
}

const a = before.split('\n');
const b = after.split('\n');
let shown = 0;
for (let i = 0; i < Math.max(a.length, b.length) && shown < 15; i++) {
  if (a[i] !== b[i]) {
    console.log(`línea normalizada ${i + 1}:\n  antes:   ${a[i] ?? '(nada)'}\n  después: ${b[i] ?? '(nada)'}`);
    shown++;
  }
}
console.error(`FALLA: ${file} cambia algo más que estilos respecto a ${ref}.`);
process.exit(1);
