with open("src/server/admin/audit-log-service.ts", "r") as f: content = f.read()
content = content.replace('return {\n    items: redactedItems,', 'try { JSON.stringify({ items: redactedItems }); } catch (e) { console.log("JSON STRINGIFY ERROR:", e); console.log("ITEMS:", redactedItems); }\n  return {\n    items: redactedItems,')
with open("src/server/admin/audit-log-service.ts", "w") as f: f.write(content)
