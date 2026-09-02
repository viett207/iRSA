import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const backupRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const applications = ['frontend-admin', 'frontend-portal'];
const sourceExtensions = new Set(['.css', '.html', '.less', '.scss', '.ts']);
const violations = [];
const sharedFoundation = path.join(backupRoot, 'shared/styles/foundation.less');

if (!fs.existsSync(sharedFoundation)) {
  violations.push('shared/styles/foundation.less — shared design-token source is missing');
}

function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(fullPath);
    return [fullPath];
  });
}

function reportMatches(file, pattern, label) {
  const source = fs.readFileSync(file, 'utf8');
  source.split('\n').forEach((line, index) => {
    if (pattern.test(line)) {
      violations.push(`${path.relative(backupRoot, file)}:${index + 1} — ${label}`);
    }
  });
}

for (const application of applications) {
  const appRoot = path.join(backupRoot, application);
  const sourceRoot = path.join(appRoot, 'src');
  const componentRoot = path.join(sourceRoot, 'app');

  for (const file of filesUnder(sourceRoot)) {
    if (!sourceExtensions.has(path.extname(file))) continue;
    reportMatches(file, /!important\b/, 'do not use !important');
    reportMatches(file, /::ng-deep\b/, 'do not use ::ng-deep');
    reportMatches(file, /(?:^|[{;])\s*--[a-zA-Z0-9_-]+\s*:/, 'define CSS variables in shared/styles/foundation.less only');
    reportMatches(file, /Montserrat/i, 'Be Vietnam Pro is the shared body font');
    if (path.extname(file) === '.ts' && file.endsWith('.component.ts')) {
      reportMatches(file, /\btemplate\s*:/, 'move Angular templates to a dedicated .html file');
      reportMatches(file, /\bstyles\s*:/, 'move Angular styles to a dedicated .scss file');
    }
  }

  for (const file of filesUnder(componentRoot)) {
    if (!sourceExtensions.has(path.extname(file))) continue;
    reportMatches(file, /\.ant(?:-|icon\b)/, 'NG-ZORRO internals belong in the global theme');
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
  const dependencies = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
  };
  for (const dependency of Object.keys(dependencies)) {
    if (/^(?:react|react-dom|shadcn|@radix-ui\/)/.test(dependency)) {
      violations.push(`${application}/package.json — forbidden React/shadcn dependency: ${dependency}`);
    }
  }

  const angularConfig = fs.readFileSync(path.join(appRoot, 'angular.json'), 'utf8');
  if (angularConfig.includes('ng-zorro-antd.min.css')) {
    violations.push(`${application}/angular.json — use src/theme.less instead of prebuilt NG-ZORRO CSS`);
  }
  if (!angularConfig.includes('"type": "anyComponentStyle"') || !angularConfig.includes('"maximumWarning": "12kb"')) {
    violations.push(`${application}/angular.json — keep the component-style warning budget at 12 kB`);
  }

  const themeEntry = fs.readFileSync(path.join(sourceRoot, 'theme.less'), 'utf8');
  if (!themeEntry.includes("../../shared/styles/foundation.less")) {
    violations.push(`${application}/src/theme.less — import the shared design foundation`);
  }
}

if (violations.length > 0) {
  console.error('UI architecture check failed:\n');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}

console.log('UI architecture check passed:');
console.log('- no React, shadcn/ui, or Radix dependency');
console.log('- no !important or ::ng-deep in application source');
console.log('- no NG-ZORRO internal selector inside Angular components');
console.log('- no inline Angular component template or stylesheet metadata');
console.log('- both applications enforce the 12 kB component-style warning budget');
console.log('- both applications use one shared CSS-variable and NG-ZORRO foundation');
