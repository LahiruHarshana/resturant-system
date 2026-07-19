#!/bin/bash
echo "=== TS Suppressions ==="
grep -rE "@ts-(nocheck|ignore|expect-error)|as any" src tests --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=coverage || echo "No suppressions found"
echo "=== Client/Server Boundary ==="
grep -rl "use client" src/ | xargs grep -E "import.*from.*('|\")(mongoose|@/server/|@/auth|server-only|PUSHER_SECRET)('|\")" || echo "No client/server boundary violations found"
echo "=== Server Secrets in UI ==="
grep -rE "PUSHER_SECRET|AUTH_SECRET|MONGODB_URI" src/components src/app --include="*.tsx" --include="*.ts" || echo "No server secrets referenced in client/app UI source"
echo "=== Direct Pusher Matches ==="
grep -rE "new Pusher|pusher-js|pusher\.trigger|trigger\(" src --include="*.ts" --include="*.tsx" || true
echo "=== Hard-coded Role Checks ==="
grep -rE "role\.name|roleName|=== ['\"]admin['\"]|=== ['\"]waiter['\"]|=== ['\"]cashier['\"]|includes\(['\"]admin['\"]\)|includes\(['\"]waiter['\"]\)" src tests || echo "No hard-coded role checks found"
echo "=== Raw Mongoose in API Routes ==="
grep -rE "\.find\(|\.findOne\(|\.findById\(|\.create\(|\.updateOne\(" src/app/api/waiter src/app/api/stations src/app/api/realtime src/app/api/cashier || echo "No raw Mongoose queries found in API routes"
echo "=== Next Guide ==="
ls docs/ai-agent-guides/19_*
