with open("src/server/admin/audit-log-service.ts", "r") as f: content = f.read()
if "data instanceof Date" not in content:
    content = content.replace(
        'if (typeof data !== "object") return data;',
        'if (typeof data !== "object" || data instanceof Date) return data;'
    )
with open("src/server/admin/audit-log-service.ts", "w") as f: f.write(content)
