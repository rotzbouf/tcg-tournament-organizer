#!/usr/bin/env node
// Gates the build on `npm audit`, but only for production dependencies —
// devDependencies (electron-builder's bundled toolchain, tsc, eslint, ...)
// never ship to end users, so their advisories don't block merges here.
// Known findings without a non-breaking fix are allowlisted below, by
// GitHub Advisory ID, so genuinely new high/critical findings still fail CI.
import { execSync } from 'node:child_process';

const ALLOWED_ADVISORIES = {
  'GHSA-qwww-vcr4-c8h2':
    'react-router RSC Mode CSRF bypass — fix requires react-router-dom v8 (breaking major bump)',
};

function runAudit() {
  try {
    const out = execSync('npm audit --omit=dev --audit-level=high --json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(out);
  } catch (err) {
    if (!err.stdout) throw err;
    return JSON.parse(err.stdout.toString());
  }
}

const report = runAudit();
const vulnerabilities = report.vulnerabilities ?? {};

const unexpected = [];
const allowlisted = [];

for (const [pkg, vuln] of Object.entries(vulnerabilities)) {
  for (const via of vuln.via) {
    if (typeof via !== 'object') continue;
    const id = via.url?.split('/').pop();
    const entry = `${pkg}: ${via.title} (${id ?? 'unknown advisory'})`;
    if (id && ALLOWED_ADVISORIES[id]) {
      allowlisted.push(entry);
    } else {
      unexpected.push(entry);
    }
  }
}

if (allowlisted.length) {
  console.log('Allowlisted findings (accepted, no non-breaking fix available):');
  for (const entry of allowlisted) console.log(`  - ${entry}`);
}

if (unexpected.length) {
  console.error('\nUnallowlisted high/critical vulnerabilities in production dependencies:');
  for (const entry of unexpected) console.error(`  - ${entry}`);
  console.error('\nRun `npm audit --omit=dev` for details, or add a reviewed exception above.');
  process.exit(1);
}

console.log('\nNo unallowlisted high/critical vulnerabilities in production dependencies.');
