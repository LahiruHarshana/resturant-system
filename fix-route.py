with open("src/app/api/admin/audit-logs/route.ts", "r") as f: content = f.read()
content = content.replace('return NextResponse.json(data);', 'return NextResponse.json(JSON.parse(JSON.stringify(data)));')
with open("src/app/api/admin/audit-logs/route.ts", "w") as f: f.write(content)
