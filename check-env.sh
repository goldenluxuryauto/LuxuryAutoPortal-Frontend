#!/bin/bash

# Quick verification script for Vercel deployment

echo "🔍 Checking Frontend Environment Variable..."
echo ""

if [ -z "$VITE_API_URL" ]; then
  echo "❌ VITE_API_URL is NOT SET!"
  echo ""
  echo "To fix this on Vercel:"
  echo "1. Go to Vercel Dashboard → Your Project"
  echo "2. Click Settings → Environment Variables"
  echo "3. Add: VITE_API_URL = https://luxuryautoportal-replit-1.onrender.com"
  echo "4. Select all environments (Production, Preview, Development)"
  echo "5. Click Save and Redeploy"
  exit 1
else
  echo "✅ VITE_API_URL is set to: $VITE_API_URL"
  echo ""
  
  # Verify it's pointing to Render
  if [[ "$VITE_API_URL" == *"onrender.com"* ]]; then
    echo "✅ Points to Render backend (correct)"
  else
    echo "⚠️  WARNING: Does not point to Render backend"
    echo "Expected: https://luxuryautoportal-replit-1.onrender.com"
    echo "Actual: $VITE_API_URL"
  fi
fi

echo ""
echo "🚀 Ready to deploy!"

