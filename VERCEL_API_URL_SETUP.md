# 🚨 VERCEL DEPLOYMENT - API URL CONFIGURATION REQUIRED

## ❌ **CURRENT ISSUE**

**Error:** `POST /api/auth/login 405 (Method Not Allowed)`

**Root Cause:** Frontend on Vercel is trying to call APIs on its own domain (`luxury-auto-portal-frontend.vercel.app`) instead of the backend domain (Render).

**Why:** The `VITE_API_URL` environment variable is **NOT SET** on Vercel.

---

## ✅ **SOLUTION: Configure Environment Variable on Vercel**

### **Step 1: Get Your Backend URL**

Your backend is deployed on Render at:
```
https://your-backend-app.onrender.com
```

Find this URL in your Render dashboard.

---

### **Step 2: Set Environment Variable on Vercel**

1. Go to **Vercel Dashboard** → Your project
2. Click **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-backend-app.onrender.com` (your Render backend URL)
   - **Environment:** Production, Preview, Development (select all)
4. Click **Save**

---

### **Step 3: Redeploy Frontend**

After setting the environment variable:
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Select **"Use existing build cache"** → Click **Redeploy**

**OR** just push a new commit to trigger automatic deployment.

---

## 🔍 **HOW IT WORKS**

### **Before (BROKEN):**
```typescript
// VITE_API_URL not set on Vercel
const API_BASE_URL = import.meta.env.VITE_API_URL || "";  // ← Empty string!
// Results in: https://luxury-auto-portal-frontend.vercel.app/api/auth/login
// ❌ Frontend doesn't have this route → 405 Method Not Allowed
```

### **After (FIXED):**
```typescript
// VITE_API_URL = "https://your-backend-app.onrender.com"
const API_BASE_URL = import.meta.env.VITE_API_URL;  // ← Backend URL!
// Results in: https://your-backend-app.onrender.com/api/auth/login
// ✅ Calls the correct backend API
```

---

## 🚀 **LOCAL DEVELOPMENT (Already Working)**

For local development, the Vite proxy in `vite.config.ts` handles this:
```typescript
proxy: {
  "/api": {
    target: "http://localhost:3001",  // Backend port
    changeOrigin: true,
  },
}
```

So `http://localhost:5000/api/auth/login` automatically proxies to `http://localhost:3001/api/auth/login`.

**But Vercel doesn't use vite.config.ts in production**, so you MUST set `VITE_API_URL`!

---

## 📋 **CHECKLIST**

- [ ] Find your Render backend URL
- [ ] Add `VITE_API_URL` environment variable on Vercel
- [ ] Set value to your Render backend URL (with `https://`)
- [ ] Redeploy frontend on Vercel
- [ ] Test login on production site

---

## 🎯 **EXPECTED RESULT**

After setting the environment variable:
- ✅ Login works on production
- ✅ All API calls go to Render backend
- ✅ CORS properly configured
- ✅ Sessions work correctly

---

## 💡 **QUICK FIX ALTERNATIVE**

If you want to hardcode the backend URL temporarily (not recommended for production):

**Edit:** `LuxuryAutoPortal-Frontend/src/lib/queryClient.ts`

```typescript
// Line 4-5: Replace with:
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://your-backend-app.onrender.com";
const apiUrl = import.meta.env.VITE_API_URL || "https://your-backend-app.onrender.com";
```

But **PROPER SOLUTION** is to set the environment variable on Vercel! ✅

