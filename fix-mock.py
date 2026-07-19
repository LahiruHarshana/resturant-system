import re

with open("tests/integration/audit-log-api.test.ts", "r") as f: content = f.read()
content = re.sub(r'vi\.mock\("@/server/admin/audit-log-service".*?\}\)\);', '', content, flags=re.DOTALL)
with open("tests/integration/audit-log-api.test.ts", "w") as f: f.write(content)

with open("tests/integration/report-api.test.ts", "r") as f: content = f.read()
content = re.sub(r'vi\.mock\("@/server/admin/report-service".*?\}\)\);', '', content, flags=re.DOTALL)
with open("tests/integration/report-api.test.ts", "w") as f: f.write(content)

with open("src/app/api/admin/audit-logs/route.ts", "r") as f: content = f.read()
content = content.replace('return NextResponse.json(JSON.parse(JSON.stringify(data)));', 'return NextResponse.json(data);')
with open("src/app/api/admin/audit-logs/route.ts", "w") as f: f.write(content)

with open("src/server/admin/audit-log-service.ts", "r") as f: content = f.read()
content = content.replace('try { JSON.stringify({ items: redactedItems }); } catch (e) { console.log("JSON STRINGIFY ERROR:", e); console.log("ITEMS:", redactedItems); }\n', '')
with open("src/server/admin/audit-log-service.ts", "w") as f: f.write(content)
