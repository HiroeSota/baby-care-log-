#!/bin/bash
# sw.jsのバージョンを現在時刻で更新してデプロイ
DATE=$(date +%Y%m%d%H%M)
sed -i '' "s|// v[0-9]*|// v$DATE|" sw.js
npx firebase deploy --only hosting
echo "✅ デプロイ完了 (v$DATE)"
