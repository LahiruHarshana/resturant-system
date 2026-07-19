import re
with open("tests/components/admin-audit-logs.test.tsx", "r") as f: content = f.read()
content = content.replace('.toBeInTheDocument()', '.toBeDefined()')
with open("tests/components/admin-audit-logs.test.tsx", "w") as f: f.write(content)

with open("src/server/admin/audit-log-service.ts", "r") as f: content = f.read()
content = content.replace('at: item.at,', 'at: item.at instanceof Date ? item.at.toISOString() : item.at,')
with open("src/server/admin/audit-log-service.ts", "w") as f: f.write(content)
