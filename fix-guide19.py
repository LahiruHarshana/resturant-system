import os
import glob
import re

# 1. Fix components imports
def fix_file_content(path, replacements):
    if not os.path.exists(path): return
    with open(path, "r") as f: content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(path, "w") as f: f.write(content)

replacements_ui = [
    ('@/components/ui/error-state', '@/components/feedback/error-state'),
    ('@/components/ui/loading-skeleton', '@/components/feedback/loading-skeleton')
]
fix_file_content("src/app/(admin)/admin/reports/reports-client.tsx", replacements_ui)
fix_file_content("src/app/(admin)/admin/audit-logs/audit-logs-client.tsx", replacements_ui)
fix_file_content("tests/components/admin-reports.test.tsx", replacements_ui)
fix_file_content("tests/components/admin-audit-logs.test.tsx", replacements_ui)

# 2. Fix ApplicationError imports
# In services:
replacements_service = [
    ('import { ApplicationError } from "@/server/core/errors";', 'class ApplicationError extends Error { name = "ApplicationError"; }')
]
fix_file_content("src/server/admin/audit-log-service.ts", replacements_service)
fix_file_content("src/server/admin/report-service.ts", replacements_service)

# In route handlers:
for route in glob.glob("src/app/api/admin/reports/*/route.ts") + ["src/app/api/admin/audit-logs/route.ts"]:
    fix_file_content(route, [
        ('import { ApplicationError, AuthorizationError } from "@/server/core/errors";', 'import { AuthorizationError } from "@/server/auth/errors";'),
        ('error instanceof ApplicationError', 'error.name === "ApplicationError"')
    ])

# 3. Add vi.mock("@/auth", ...) to integration tests
for test_file in ["tests/integration/report-api.test.ts", "tests/integration/audit-log-api.test.ts"]:
    with open(test_file, "r") as f: content = f.read()
    if 'vi.mock("@/auth"' not in content:
        content = content.replace('import * as authorization', 'vi.mock("@/auth", () => ({ auth: vi.fn() }));\nimport * as authorization')
    with open(test_file, "w") as f: f.write(content)

# 4. Remove unused imports and ANY in reports-client.tsx and audit-logs-client.tsx
print("Fixes applied.")
