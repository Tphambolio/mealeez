#!/bin/bash

echo "🧪 Testing MealBuilder Deployment..."
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="https://mealeez-production.up.railway.app"

# Test 1: Health Check
echo "1️⃣  Testing API Health..."
HEALTH=$(curl -s "${BASE_URL}/api/health")
if echo "$HEALTH" | grep -q '"ok":true'; then
    echo -e "${GREEN}✓ API is running${NC}"
    echo "$HEALTH" | jq '.' 2>/dev/null || echo "$HEALTH"
else
    echo -e "${RED}✗ API health check failed${NC}"
    echo "$HEALTH"
fi
echo ""

# Test 2: Main Page
echo "2️⃣  Testing main page load..."
MAIN_PAGE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/")
HTTP_CODE=$(echo "$MAIN_PAGE" | tail -n 1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Main page loads (HTTP $HTTP_CODE)${NC}"
    if echo "$MAIN_PAGE" | grep -q "MealBuilder"; then
        echo -e "${GREEN}✓ Page contains 'MealBuilder' text${NC}"
    fi
else
    echo -e "${RED}✗ Main page failed (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 3: Manifest
echo "3️⃣  Testing PWA manifest..."
MANIFEST=$(curl -s -w "\n%{http_code}" "${BASE_URL}/manifest.json")
HTTP_CODE=$(echo "$MANIFEST" | tail -n 1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Manifest loads (HTTP $HTTP_CODE)${NC}"
    echo "$MANIFEST" | head -n -1 | jq '.' 2>/dev/null || echo "$MANIFEST"
else
    echo -e "${RED}✗ Manifest failed (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 4: Icon
echo "4️⃣  Testing icon.svg..."
ICON=$(curl -s -w "\n%{http_code}" "${BASE_URL}/icon.svg")
HTTP_CODE=$(echo "$ICON" | tail -n 1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Icon loads (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ Icon failed (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test 5: API Endpoints
echo "5️⃣  Testing API endpoints..."

echo "   Testing GET /api/recipes..."
RECIPES=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/recipes")
HTTP_CODE=$(echo "$RECIPES" | tail -n 1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}   ✓ Recipes endpoint works (HTTP $HTTP_CODE)${NC}"
    RECIPE_COUNT=$(echo "$RECIPES" | head -n -1 | jq 'length' 2>/dev/null || echo "?")
    echo "   Found $RECIPE_COUNT recipes"
else
    echo -e "${RED}   ✗ Recipes endpoint failed (HTTP $HTTP_CODE)${NC}"
fi

echo ""
echo "✅ Testing complete!"
