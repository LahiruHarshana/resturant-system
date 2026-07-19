import os
import re

# 1. Add jsdom env to component tests
for f in ["tests/components/admin-reports.test.tsx", "tests/components/admin-audit-logs.test.tsx"]:
    with open(f, "r") as file:
        content = file.read()
    if "@vitest-environment jsdom" not in content:
        with open(f, "w") as file:
            file.write("/**\n * @vitest-environment jsdom\n */\n" + content)

# 2. Mock services in integration tests to avoid DB connection timeouts
# and fix the mock for AuthorizationError since the regex sed replacement was probably slightly off.
report_api_test = "tests/integration/report-api.test.ts"
with open(report_api_test, "r") as file:
    content = file.read()
    content = content.replace('vi.mock("@/server/auth/session");', 'vi.mock("@/server/auth/session");\nvi.mock("@/server/admin/report-service", () => ({ getSalesSummary: vi.fn().mockResolvedValue({}) }));')
    content = content.replace('Object.assign(new Error("Denied"), { name: "AuthorizationError" })', 'new AuthorizationError("Denied")')
    content = content.replace('import { AuthorizationError } from "@/server/auth/errors";', 'import { AuthorizationError, AuthenticationError } from "@/server/auth/errors";')
    content = content.replace('Object.assign(new Error("Auth required"), { name: "AuthenticationError" })', 'new AuthenticationError("Auth required")')

with open(report_api_test, "w") as file:
    file.write(content)

audit_api_test = "tests/integration/audit-log-api.test.ts"
with open(audit_api_test, "r") as file:
    content = file.read()
    content = content.replace('vi.mock("@/server/auth/authorization");', 'vi.mock("@/server/auth/authorization");\nvi.mock("@/server/admin/audit-log-service", () => ({ getAuditLogs: vi.fn().mockResolvedValue({ items: [], totalPages: 1, page: 1 }) }));')
    content = content.replace('Object.assign(new Error("Denied"), { name: "AuthorizationError" })', 'new AuthorizationError("Denied")')
    content = content.replace('import { AuthorizationError } from "@/server/auth/errors";', 'import { AuthorizationError, AuthenticationError } from "@/server/auth/errors";')
    content = content.replace('Object.assign(new Error("Auth required"), { name: "AuthenticationError" })', 'new AuthenticationError("Auth required")')

with open(audit_api_test, "w") as file:
    file.write(content)

