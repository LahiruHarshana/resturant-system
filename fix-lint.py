with open("src/server/admin/report-service.ts", "r") as f: content = f.read()
content = content.replace('// @ts-ignore', '// @ts-expect-error')
with open("src/server/admin/report-service.ts", "w") as f: f.write(content)

with open("tests/components/admin-reports.test.tsx", "r") as f: content = f.read()
content = content.replace('import { render, screen, waitFor, fireEvent } from "@testing-library/react";', 'import { render, screen, waitFor } from "@testing-library/react";')
with open("tests/components/admin-reports.test.tsx", "w") as f: f.write(content)

for path in ["tests/integration/audit-log-api.test.ts", "tests/integration/report-api.test.ts"]:
    with open(path, "r") as f: content = f.read()
    content = content.replace('import { AuthorizationError, AuthenticationError } from "@/server/auth/errors";', 'import { AuthorizationError } from "@/server/auth/errors";')
    with open(path, "w") as f: f.write(content)
