import re
with open("tests/components/admin-reports.test.tsx", "r") as f: content = f.read()
content = re.sub(r',\s*fireEvent', '', content)
content = re.sub(r'fireEvent,\s*', '', content)
with open("tests/components/admin-reports.test.tsx", "w") as f: f.write(content)
