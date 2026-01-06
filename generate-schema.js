#!/usr/bin/env node

/**
 * Generate a consolidated database schema overview
 * Reads all migration files and extracts CREATE TABLE statements
 */

const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'supabase/migrations');
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log('# QWIKKER Database Schema Overview');
console.log(`\nGenerated from ${files.length} migration files`);
console.log('=' .repeat(80));

const tables = {};

files.forEach(file => {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  
  // Extract CREATE TABLE statements
  const createTableRegex = /CREATE TABLE[^;]+;/gis;
  const matches = content.match(createTableRegex) || [];
  
  matches.forEach(match => {
    // Extract table name
    const nameMatch = match.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:public\.)?(\w+)/i);
    if (nameMatch) {
      const tableName = nameMatch[1];
      tables[tableName] = tables[tableName] || [];
      tables[tableName].push({
        file: file,
        sql: match.trim()
      });
    }
  });
  
  // Extract ALTER TABLE ADD COLUMN statements
  const alterTableRegex = /ALTER TABLE\s+(?:public\.)?(\w+)\s+ADD COLUMN[^;]+;/gis;
  const alterMatches = content.match(alterTableRegex) || [];
  
  alterMatches.forEach(match => {
    const nameMatch = match.match(/ALTER TABLE\s+(?:public\.)?(\w+)/i);
    if (nameMatch) {
      const tableName = nameMatch[1];
      tables[tableName] = tables[tableName] || [];
      tables[tableName].push({
        file: file,
        sql: match.trim(),
        isAlter: true
      });
    }
  });
});

console.log(`\n## Tables Found: ${Object.keys(tables).length}\n`);

Object.keys(tables).sort().forEach(tableName => {
  console.log(`\n### ${tableName}`);
  console.log('-'.repeat(80));
  
  const creates = tables[tableName].filter(t => !t.isAlter);
  const alters = tables[tableName].filter(t => t.isAlter);
  
  if (creates.length > 0) {
    console.log(`\n**Created in:** ${creates[0].file}`);
    console.log('\n```sql');
    console.log(creates[0].sql);
    console.log('```');
  }
  
  if (alters.length > 0) {
    console.log(`\n**Modified in ${alters.length} migration(s):**`);
    alters.forEach(alter => {
      console.log(`\n- ${alter.file}`);
      console.log('```sql');
      console.log(alter.sql);
      console.log('```');
    });
  }
});

console.log('\n' + '='.repeat(80));
console.log('END OF SCHEMA');

