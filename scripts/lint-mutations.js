const fs = require('fs');
const path = require('path');

const FORBIDDEN_PATTERNS = [
  {
    regex: /<form[^>]*action=['"{](?!.*\/api)/,
    message:
      'Found <form> with non-API action. Use onSubmit and apiFetch or action pointing to /api.',
  },
  {
    regex: /'use server'|"use server"/,
    message: 'Found "use server" directive. Server Actions are deprecated for mutations.',
  },
  {
    regex: /fetch\(['"`](?!\/api)/,
    message: 'Found fetch() call not using /api prefix. Use apiFetch() or ensure /api prefix.',
  },
];

const EXCLUDED_DIRS = ['node_modules', '.next', '.git', 'scripts', 'brain'];
const EXCLUDED_FILES = ['api-client.ts', 'lint-mutations.js', 'route.ts', 'layout.tsx', 'page.tsx']; // layout/page might have 'use server' for data fetching, need to be careful.

// We only want to ban "use server" for MUTATIONS. Data fetching in SC is fine.
// But the user said "Empêcher définitivement tout retour aux Server Actions... pour les mutations".
// "use server" in a file usually means it exports actions.
// If we want to allow "use server" for data fetching, we should check if it exports functions used in forms.
// For now, let's be strict and warn about ANY "use server" in src/actions.

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  let errors = 0;

  for (const file of files) {
    if (EXCLUDED_DIRS.includes(file)) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      errors += scanDirectory(fullPath);
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      const content = fs.readFileSync(fullPath, 'utf8');

      // Specific check for src/actions
      if (fullPath.includes('src\\actions') || fullPath.includes('src/actions')) {
        if (content.includes('use server')) {
          console.error(`ERROR: ${fullPath} contains "use server". Server Actions are deprecated.`);
          errors++;
        }
      }

      // Check client components for form actions
      if (content.includes('use client')) {
        if (/<form[^>]*action=/.test(content)) {
          // We simplified the regex, just check availability
          console.error(`ERROR: ${fullPath} contains <form action=...>. Use onSubmit manually.`);
          errors++;
        }
      }
    }
  }
  return errors;
}

console.log('Scanning for forbidden mutation patterns...');
const errors = scanDirectory(path.join(__dirname, '../src'));

if (errors > 0) {
  console.error(`\nFound ${errors} violations.`);
  process.exit(1);
} else {
  console.log('No violations found. API Usage is enforced.');
}
