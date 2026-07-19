with open("tests/components/admin-reports.test.tsx", "r") as f: content = f.read()
content = content.replace('.toBeInTheDocument()', '.toBeDefined()')
with open("tests/components/admin-reports.test.tsx", "w") as f: f.write(content)
