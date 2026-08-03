const fs = require('node:fs')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..')
const workflowPath = path.join(projectRoot, '.github', 'workflows', 'ci.yml')

if (!fs.existsSync(workflowPath)) {
  throw new Error('Missing .github/workflows/ci.yml')
}

const workflow = fs.readFileSync(workflowPath, 'utf8')
const requirements = [
  ['read-only repository permission', /permissions:\s*\n\s+contents:\s*read/],
  ['Windows runner', /runs-on:\s*windows-latest/],
  ['Fedora 44 container', /image:\s*fedora:44/],
  ['checkout action v6', /uses:\s*actions\/checkout@v6/g],
  ['setup-node action v6', /uses:\s*actions\/setup-node@v6/g],
  ['upload-artifact action v7', /uses:\s*actions\/upload-artifact@v7/g],
  ['pinned Node.js version', /node-version:\s*22\.20\.0/g],
  ['clean dependency installation', /run:\s*npm ci/g],
  ['full project check', /run:\s*npm run check/g],
  ['cross-platform package entry', /run:\s*node scripts\/package\.cjs/g],
]

for (const [description, pattern] of requirements) {
  const matches = workflow.match(pattern) ?? []
  const expectedCount = pattern.global ? 2 : 1
  if (matches.length < expectedCount) {
    throw new Error(`CI workflow is missing ${description}`)
  }
}

console.log('CI workflow validation passed')
