#!/bin/bash

API_URL="http://localhost:3000"
PHONE="0987888888"
PASSWORD="test123456"
FULL_NAME="Test Integration"

echo "📝 Testing /api/auth/register-with-phone endpoint..."
echo ""

curl -X POST "$API_URL/api/auth/register-with-phone" \
  -H "Content-Type: application/json" \
  -d "{
    \"phone_number\": \"$PHONE\",
    \"password\": \"$PASSWORD\",
    \"full_name\": \"$FULL_NAME\",
    \"district_code\": null,
    \"role\": \"PLAYER\"
  }" \
  -w "\n\nStatus: %{http_code}\n" 2>/dev/null | python3 -m json.tool

echo ""
echo "✅ Done!"
