# 🚀 Mystery Mosaic - Quick Setup Guide

## ⚡ Quick Start (No Database Required)

If you want to test the app immediately without setting up MySQL:

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Simple Server
```bash
npm run start-simple
```

### 3. Open Browser
Navigate to: `http://localhost:3000`

### 4. Test the App
- Sign up with any email and password
- You'll get 5 free demos
- Try creating a mosaic and downloading it
- After 5 downloads, you'll see the subscription popup

---

## 🗄️ Full Setup (With MySQL Database)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up MySQL Database
```bash
# Option A: Use the automated setup
npm run setup

# Option B: Manual setup
mysql -u root -p < database.sql
```

### 3. Start Full Server
```bash
npm start
```

### 4. Open Browser
Navigate to: `http://localhost:3000`

---

## 🧪 Testing the Server

### Test Simple Server
```bash
# Start simple server in one terminal
npm run start-simple

# In another terminal, test the server
node test-server.js
```

### Test Full Server
```bash
# Start full server in one terminal
npm start

# In another terminal, test the server
node test-server.js
```

---

## 🔧 Troubleshooting

### "Network Error" Message

**Problem**: You see "Network error. Please try again." when trying to sign up/login.

**Solutions**:

1. **Check if server is running**:
   ```bash
   # Check if port 3000 is in use
   netstat -an | grep 3000
   
   # Or check with lsof (Mac/Linux)
   lsof -i :3000
   ```

2. **Start the server**:
   ```bash
   # For simple version (no database)
   npm run start-simple
   
   # For full version (with database)
   npm start
   ```

3. **Check server logs**:
   Look for error messages in the terminal where you started the server.

4. **Verify dependencies**:
   ```bash
   npm install
   ```

5. **Try a different port**:
   ```bash
   PORT=3001 npm run start-simple
   ```
   Then open: `http://localhost:3001`

### Database Connection Issues

**Problem**: "Cannot connect to database" errors.

**Solutions**:

1. **Use simple server instead**:
   ```bash
   npm run start-simple
   ```

2. **Check MySQL is running**:
   ```bash
   # Check MySQL status
   mysql -u root -p -e "SELECT 1;"
   ```

3. **Create database manually**:
   ```sql
   CREATE DATABASE mystery_mosaic;
   USE mystery_mosaic;
   -- Then run the contents of database.sql
   ```

### Port Already in Use

**Problem**: "EADDRINUSE" error.

**Solutions**:

1. **Kill process using port 3000**:
   ```bash
   # Find process using port 3000
   lsof -ti:3000
   
   # Kill the process
   kill -9 $(lsof -ti:3000)
   ```

2. **Use different port**:
   ```bash
   PORT=3001 npm run start-simple
   ```

---

## 📱 How to Use the App

### 1. Sign Up
- Go to `http://localhost:3000`
- Click "Sign Up" tab
- Enter email and password
- Click "Create Account"

### 2. Create Mosaic
- Upload an image
- Choose shape (rectangle, triangle, circle, hex, polygon)
- Adjust settings (cell size, colors, etc.)
- Download as SVG, PNG, or PDF

### 3. Demo System
- You get 5 free downloads
- Each download counts as 1 demo
- Counter shows "Demos used: X/5"
- After 5 demos, subscription popup appears

### 4. Subscription
- Choose Monthly ($15) or Yearly ($150)
- Click "Subscribe"
- Get unlimited access

---

## 🎯 Features Working

✅ **Authentication**: Sign up, login, logout  
✅ **Demo Tracking**: 5 free demos per email  
✅ **Subscription System**: Monthly/Yearly plans  
✅ **Mosaic Creator**: Upload, customize, download  
✅ **User Interface**: Beautiful, responsive design  
✅ **Error Handling**: Clear error messages  

---

## 🆘 Still Having Issues?

1. **Check the console**:
   - Open browser developer tools (F12)
   - Look at Console tab for errors
   - Check Network tab for failed requests

2. **Check server logs**:
   - Look at the terminal where you started the server
   - Look for error messages

3. **Try the simple version**:
   ```bash
   npm run start-simple
   ```
   This version doesn't need MySQL and stores data in memory.

4. **Reset everything**:
   ```bash
   # Stop server (Ctrl+C)
   # Clear node_modules
   rm -rf node_modules package-lock.json
   npm install
   npm run start-simple
   ```

---

## 📞 Support

If you're still having issues, please share:
1. The exact error message you see
2. What you see in the browser console (F12)
3. What you see in the server terminal
4. Which operating system you're using

The app should work perfectly with these instructions! 🎉
