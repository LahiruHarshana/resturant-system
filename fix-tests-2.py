import os

# Fix 1: Add // @vitest-environment jsdom
def fix_jsdom(path):
    with open(path, "r") as f: content = f.read()
    if "// @vitest-environment jsdom" not in content:
        content = "// @vitest-environment jsdom\n" + content.replace("/**\n * @vitest-environment jsdom\n */\n", "")
    with open(path, "w") as f: f.write(content)

fix_jsdom("tests/components/admin-reports.test.tsx")
fix_jsdom("tests/components/admin-audit-logs.test.tsx")

# Fix 2: Add import for AuthorizationError if missing
def fix_auth_import(path):
    with open(path, "r") as f: content = f.read()
    if 'import { AuthorizationError } from "@/server/auth/errors";' not in content and 'import { AuthorizationError, AuthenticationError } from "@/server/auth/errors";' not in content:
        content = content.replace('import * as authorization', 'import { AuthorizationError, AuthenticationError } from "@/server/auth/errors";\nimport * as authorization')
    with open(path, "w") as f: f.write(content)

fix_auth_import("tests/integration/report-api.test.ts")
fix_auth_import("tests/integration/audit-log-api.test.ts")

# Fix 3: Fix fetch mock in reports test
with open("tests/components/admin-reports.test.tsx", "r") as f: content = f.read()
content = content.replace('''
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        totalRevenueMinor: 1000,
        paidTicketCount: 1,
        averageTicketValueMinor: 1000,
      }),
    });
''', '''
    (global.fetch as any).mockImplementation(async (url: string) => {
      if (url.includes('sales')) return { ok: true, json: async () => ({ totalRevenueMinor: 1000, paidTicketCount: 1, averageTicketValueMinor: 1000 }) };
      if (url.includes('items')) return { ok: true, json: async () => ([]) };
      if (url.includes('payments')) return { ok: true, json: async () => ([]) };
      if (url.includes('performance')) return { ok: true, json: async () => ({}) };
    });
''')
content = content.replace('''
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        totalRevenueMinor: 0,
        paidTicketCount: 0,
        averageTicketValueMinor: 0,
      }),
    });
''', '''
    (global.fetch as any).mockImplementation(async (url: string) => {
      if (url.includes('sales')) return { ok: true, json: async () => ({ totalRevenueMinor: 0, paidTicketCount: 0, averageTicketValueMinor: 0 }) };
      if (url.includes('items')) return { ok: true, json: async () => ([]) };
      if (url.includes('payments')) return { ok: true, json: async () => ([]) };
      if (url.includes('performance')) return { ok: true, json: async () => ({}) };
    });
''')
content = content.replace('''
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        totalRevenueMinor: 0,
        paidTicketCount: 0,
      }),
    });
''', '''
    (global.fetch as any).mockImplementation(async (url: string) => {
      if (url.includes('sales')) return { ok: true, json: async () => ({ totalRevenueMinor: 0, paidTicketCount: 0, averageTicketValueMinor: 0 }) };
      if (url.includes('items')) return { ok: true, json: async () => ([]) };
      if (url.includes('payments')) return { ok: true, json: async () => ([]) };
      if (url.includes('performance')) return { ok: true, json: async () => ({}) };
    });
''')
with open("tests/components/admin-reports.test.tsx", "w") as f: f.write(content)

