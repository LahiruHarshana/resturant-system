# Move formatMoney to money.ts
with open("src/shared/money/index.ts", "w") as f:
    f.write('export * from "./money";\n')

with open("src/shared/money/money.ts", "r") as f: content = f.read()
if "export function formatMoney" not in content:
    with open("src/shared/money/money.ts", "a") as f:
        f.write('\nexport function formatMoney(amountMinor: number) {\n  return `$${minorToDisplay(amountMinor, 2)}`;\n}\n')

# Fix tests/components/admin-reports.test.tsx
with open("tests/components/admin-reports.test.tsx", "r") as f: content = f.read()
content = content.replace('screen.getByRole("combobox")', 'await screen.findByRole("combobox")')
with open("tests/components/admin-reports.test.tsx", "w") as f: f.write(content)

# Fix tests/integration/audit-log-api.test.ts
with open("tests/integration/audit-log-api.test.ts", "r") as f: content = f.read()
content = content.replace('''
    const res = await auditHandler(req);
    expect(res.status).toBe(200);
''', '''
    const res = await auditHandler(req);
    if (res.status !== 200) console.log(await res.json());
    expect(res.status).toBe(200);
''')
with open("tests/integration/audit-log-api.test.ts", "w") as f: f.write(content)

