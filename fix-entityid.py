with open("src/server/admin/audit-log-service.ts", "r") as f: content = f.read()
content = content.replace('entityId: item.entityId,', 'entityId: item.entityId?.toString() || null,')
with open("src/server/admin/audit-log-service.ts", "w") as f: f.write(content)
