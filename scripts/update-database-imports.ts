#!/usr/bin/env tsx

import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';
import path from 'path';

async function updateDatabaseImports() {
  console.log('🔄 Updating database imports across the codebase...\n');

  // Find all TypeScript files that import from '@/lib/postgres'
  const files = await glob('src/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/database/**']
  });

  let updatedCount = 0;
  const errors: string[] = [];

  for (const file of files) {
    try {
      let content = await readFile(file, 'utf-8');
      let modified = false;

      // Check if file uses old imports
      if (content.includes("from '@/lib/postgres'")) {
        // Replace import statement
        content = content.replace(
          /import\s*{\s*executeQuery\s*(?:,\s*[^}]+)?\s*}\s*from\s*['"]@\/lib\/postgres['"]/g,
          "import { db } from '@/lib/database/connection'"
        );
        
        // Also handle other imports from postgres
        content = content.replace(
          /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@\/lib\/postgres['"]/g,
          (match, imports) => {
            const importList = imports.split(',').map((i: string) => i.trim());
            const newImports: string[] = [];
            const dbImports: string[] = [];
            
            importList.forEach((imp: string) => {
              if (imp === 'executeQuery') {
                dbImports.push('db');
              } else if (['findOne', 'findMany', 'insertOne', 'updateOne', 'deleteMany'].includes(imp)) {
                dbImports.push('qb');
              } else if (imp === 'db') {
                dbImports.push('db');
              } else {
                newImports.push(imp);
              }
            });
            
            const importStatements: string[] = [];
            if (dbImports.length > 0) {
              const uniqueDbImports = [...new Set(dbImports)];
              importStatements.push(`import { ${uniqueDbImports.join(', ')} } from '@/lib/database/connection'`);
              if (uniqueDbImports.includes('qb')) {
                importStatements.push(`import { qb } from '@/lib/database/query-builder'`);
              }
            }
            if (newImports.length > 0) {
              importStatements.push(`import { ${newImports.join(', ')} } from '@/lib/postgres'`);
            }
            
            return importStatements.join(';\n');
          }
        );

        // Replace executeQuery calls
        content = content.replace(/executeQuery\(/g, 'db.query(');
        
        // Replace deprecated helper function calls
        content = content.replace(/\bfindOne\(/g, 'qb.findOne(');
        content = content.replace(/\bfindMany\(/g, 'qb.findMany(');
        content = content.replace(/\binsertOne\(/g, 'qb.insertOne(');
        content = content.replace(/\bupdateOne\(/g, 'qb.updateOne(');
        content = content.replace(/\bdeleteMany\(/g, 'qb.deleteMany(');
        
        modified = true;
      }

      // Check for direct executeQuery usage without proper import
      if (content.includes('executeQuery(') && !content.includes("from '@/lib/database/connection'")) {
        if (!content.includes("import { db }")) {
          // Add import at the top of the file
          const importMatch = content.match(/^(import[\s\S]*?)\n\n/);
          if (importMatch) {
            content = content.replace(
              importMatch[0],
              `${importMatch[1]}\nimport { db } from '@/lib/database/connection';\n\n`
            );
          } else {
            content = `import { db } from '@/lib/database/connection';\n\n${content}`;
          }
        }
        content = content.replace(/executeQuery\(/g, 'db.query(');
        modified = true;
      }

      if (modified) {
        await writeFile(file, content, 'utf-8');
        updatedCount++;
        console.log(`✅ Updated: ${path.relative(process.cwd(), file)}`);
      }
    } catch (error) {
      errors.push(`${file}: ${error}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Files scanned: ${files.length}`);
  console.log(`   Files updated: ${updatedCount}`);
  console.log(`   Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.error('\n❌ Errors:');
    errors.forEach(err => console.error(`   ${err}`));
  }

  console.log('\n✨ Update complete!');
}

// Run the update
updateDatabaseImports().catch(console.error);