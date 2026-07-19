import os, re

def replace_in_file(path, replacements):
    if not os.path.exists(path): return
    with open(path, "r") as f: content = f.read()
    for old, new in replacements:
        if isinstance(old, re.Pattern): content = old.sub(new, content)
        else: content = content.replace(old, new)
    with open(path, "w") as f: f.write(content)

# Fix API Routes
routes = [
    "src/app/api/admin/audit-logs/route.ts",
    "src/app/api/admin/reports/payments/route.ts",
    "src/app/api/admin/reports/sales/route.ts",
    "src/app/api/admin/reports/items/route.ts",
    "src/app/api/admin/reports/performance/route.ts"
]

error_catch_old = '} catch (error: any) {'
error_catch_new = '''} catch (error: unknown) {
    const err = error as Error;'''

for r in routes:
    replace_in_file(r, [
        (error_catch_old, error_catch_new),
        ('error.name', 'err.name'),
        ('error.message', 'err.message')
    ])

# Fix report-service.ts
replace_in_file("src/server/admin/report-service.ts", [
    ('dailyResult.map((d: any) =>', 'dailyResult.map((d: { _id: string; revenue: number; tickets: number }) =>'),
    ('results.map((r: any) =>', 'results.map((r: { _id: string; total: number; qty: number; revenue?: number }) =>')
])

# Fix audit-log-service.ts
replace_in_file("src/server/admin/audit-log-service.ts", [
    ('export function redactSensitiveData(data: any): any {', 'export function redactSensitiveData(data: Record<string, unknown>): Record<string, unknown> {'),
    ('const redacted: any = {};', 'const redacted: Record<string, unknown> = {};'),
    ('items.map((item: any) =>', 'items.map((item: Record<string, unknown>) =>')
])

# Fix test files
for tf in ["tests/components/admin-reports.test.tsx", "tests/components/admin-audit-logs.test.tsx"]:
    replace_in_file(tf, [
        ('(global.fetch as any)', '(global.fetch as unknown as import("vitest").Mock)')
    ])
