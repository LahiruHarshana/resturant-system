with open("tests/components/admin-reports.test.tsx", "r") as f: content = f.read()
content = content.replace('await screen.findByText("$10.00")', '(await screen.findAllByText("$10.00"))[0]')
content = content.replace('await screen.findByText("$0.00")', '(await screen.findAllByText("$0.00"))[0]')
with open("tests/components/admin-reports.test.tsx", "w") as f: f.write(content)
