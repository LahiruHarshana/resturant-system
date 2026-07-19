with open("src/server/admin/audit-log-service.ts", "r") as f: content = f.read()
content = content.replace('  name = "ApplicationError";\nimport { connectToDatabase }', '  name = "ApplicationError";\n}\nimport { connectToDatabase }')
with open("src/server/admin/audit-log-service.ts", "w") as f: f.write(content)
