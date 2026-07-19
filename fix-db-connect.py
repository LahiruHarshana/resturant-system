with open("src/server/admin/report-service.ts", "r") as f: content = f.read()
if 'import { connectToDatabase }' not in content:
    content = content.replace('import { TicketModel, OrderLineModel, PaymentModel } from "@/server/db/models";', 'import { TicketModel, OrderLineModel, PaymentModel } from "@/server/db/models";\nimport { connectToDatabase } from "@/server/db/connect";')
    content = content.replace('export async function getSalesSummary', 'export async function getSalesSummary(range: ReportDateRange) {\n  await connectToDatabase();\n  validateRange(range);\n  // @ts-ignore')
    content = content.replace('export async function getPaymentBreakdown', 'export async function getPaymentBreakdown(range: ReportDateRange) {\n  await connectToDatabase();\n  validateRange(range);\n  // @ts-ignore')
    content = content.replace('export async function getExceptionSummary', 'export async function getExceptionSummary(range: ReportDateRange) {\n  await connectToDatabase();\n  validateRange(range);\n  // @ts-ignore')
    content = content.replace('export async function getItemPerformance', 'export async function getItemPerformance(range: ReportDateRange) {\n  await connectToDatabase();\n  validateRange(range);\n  // @ts-ignore')
    
    # We replaced the signature with a new body start, so we need to fix the original body start
    content = content.replace('  // @ts-ignore\n  validateRange(range);', '')
    with open("src/server/admin/report-service.ts", "w") as f: f.write(content)
