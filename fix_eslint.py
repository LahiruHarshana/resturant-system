import os
files = [
    "src/app/api/admin/audit-logs/route.ts",
    "src/app/api/admin/reports/items/route.ts",
    "src/app/api/admin/reports/payments/route.ts",
    "src/app/api/admin/reports/performance/route.ts",
    "src/app/api/admin/reports/sales/route.ts",
    "src/server/admin/audit-log-service.ts",
    "src/server/admin/report-service.ts",
    "tests/components/admin-audit-logs.test.tsx",
    "tests/components/admin-reports.test.tsx"
]
for path in files:
    if os.path.exists(path):
        with open(path, "r") as f: content = f.read()
        content = content.replace("/* eslint-disable @typescript-eslint/no-explicit-any */\n", "")
        content = content.replace("/* eslint-disable @typescript-eslint/no-explicit-any */", "")
        with open(path, "w") as f: f.write(content)
print("Removed eslint-disable directives.")
