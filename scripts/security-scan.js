/**
 * HireSync Local Anti-Backdoor & Security Scanner
 * Runs static security analysis to detect backdoors, master credentials, secret leaks,
 * dangerous function execution, and suspicious endpoint bypasses before code is committed.
 */

const fs = require('fs');
const path = require('path');

// Target directory to scan (recursively)
const ROOT_DIR = path.resolve(__dirname, '..');

// File extensions to inspect
const EXTENSIONS_TO_SCAN = ['.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.py', '.sh'];

// Ignored paths
const IGNORED_PATHS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'scripts', // Ignore scanner itself
];

// Anti-Backdoor & Security Vulnerability Signature Rules
const SECURITY_RULES = [
  {
    id: 'SEC-001',
    name: 'Hardcoded Master Password / Auth Bypass',
    severity: 'HIGH',
    regex: /(password\s*===?\s*['"](admin|root|password|master|123456|pass|secret|bypass)['"]|bypassAuth\s*[:=]\s*true|isBackdoor\s*[:=]|skipAuth\s*[:=]\s*true)/i,
    description: 'Detected hardcoded password check or authentication bypass variable.',
  },
  {
    id: 'SEC-002',
    name: 'Hardcoded Secret / API Key / Database Credentials',
    severity: 'HIGH',
    regex: /(JWT_SECRET\s*=\s*['"][^'"]{3,}['"]|AWS_SECRET_ACCESS_KEY\s*=\s*['"][^'"]{5,}['"]|DATABASE_URL\s*=\s*['"]postgres:\/\/[^'"]+['"]|api_key\s*:\s*['"]sk_[^'"]+['"])/i,
    description: 'Detected hardcoded secret key or database URI string in source code.',
  },
  {
    id: 'SEC-003',
    name: 'Dangerous Dynamic Code Execution (eval / exec)',
    severity: 'HIGH',
    regex: /(\beval\s*\(|new\s+Function\s*\(|child_process\.(exec|spawn)|require\(['"]child_process['"]\))/g,
    description: 'Detected dangerous dynamic code evaluation or OS command execution.',
  },
  {
    id: 'SEC-004',
    name: 'Hidden Backdoor API Route or Debug Shell',
    severity: 'HIGH',
    regex: /(app|router)\.(get|post|put|delete|use)\s*\(\s*['"]\/(backdoor|debug-shell|dump-db|admin-override|root-access|exec-cmd)['"]/i,
    description: 'Detected suspicious or unauthenticated backdoor / debug route definition.',
  },
  {
    id: 'SEC-005',
    name: 'Obfuscated Code Execution (Base64 Decode Execution)',
    severity: 'MEDIUM',
    regex: /(Buffer\.from\([^)]+,\s*['"]base64['"]\)\.toString\([^)]*\)\s*\)?|eval\s*\(\s*atob\s*\()/i,
    description: 'Detected runtime execution of obfuscated or base64-encoded code strings.',
  },
];

let totalFilesScanned = 0;
let totalViolationsFound = 0;
const violationsList = [];

function isIgnored(filepath) {
  const relative = path.relative(ROOT_DIR, filepath);
  return IGNORED_PATHS.some((ignored) => relative.startsWith(ignored) || relative.includes(`${path.sep}${ignored}`));
}

function scanFile(filepath) {
  if (isIgnored(filepath)) return;
  const ext = path.extname(filepath).toLowerCase();
  if (!EXTENSIONS_TO_SCAN.includes(ext)) return;

  totalFilesScanned++;
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    SECURITY_RULES.forEach((rule) => {
      if (rule.regex.test(line)) {
        totalViolationsFound++;
        violationsList.push({
          file: path.relative(ROOT_DIR, filepath),
          line: lineIndex + 1,
          ruleId: rule.id,
          name: rule.name,
          severity: rule.severity,
          description: rule.description,
          codeSnippet: line.trim(),
        });
      }
    });
  });
}

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (isIgnored(fullPath)) continue;

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      scanFile(fullPath);
    }
  }
}

console.log('====================================================');
console.log(' 🛡️  HireSync Local Anti-Backdoor & Security Scanner');
console.log('====================================================\n');
console.log(`Scanning repository files in: ${ROOT_DIR}\n`);

scanDirectory(ROOT_DIR);

console.log(`Scanned ${totalFilesScanned} file(s).\n`);

if (totalViolationsFound === 0) {
  console.log('✅ Security Scan PASSED: No backdoors, secret leaks, or dangerous patterns detected.\n');
  process.exit(0);
} else {
  console.log(`🚨 Security Scan FAILED: Found ${totalViolationsFound} potential security violation(s)!\n`);
  
  violationsList.forEach((v, index) => {
    console.log(`[${index + 1}] [${v.severity}] ${v.ruleId}: ${v.name}`);
    console.log(`    File: ${v.file}:${v.line}`);
    console.log(`    Detail: ${v.description}`);
    console.log(`    Snippet: "${v.codeSnippet}"\n`);
  });

  console.log('❌ Action Required: Remove backdoors, master credentials, or dangerous code before committing.');
  process.exit(1);
}
