# GitHub Pages Deployment Guide

## 🚀 Current Setup

Your React app is configured to automatically deploy to GitHub Pages at: **https://bewareoftherocks.github.io**

## 📋 How It Works

1. **Repository**: `BewareOfTheRocks.github.io` (special naming for root domain)
2. **Source**: React app in `/frontend` folder
3. **Deployment**: Automatic via GitHub Actions
4. **Target**: GitHub Pages serves from GitHub Actions artifact

## 🔄 Automatic Deployment

Every time you push to the `main` branch, the deployment happens automatically:

1. GitHub Actions detects the push
2. Installs Node.js dependencies
3. Builds the React app (`npm run build`)
4. Deploys to GitHub Pages

## 📝 Manual Deployment Steps

If you need to deploy manually or update the site:

### Method 1: Push to Main (Recommended)
```bash
# Make your changes to the React app in /frontend
cd /home/rafael/Documents/BewareOfTheRocks

# Stage and commit your changes
git add .
git commit -m "Your commit message here"

# Push to trigger automatic deployment
git push origin main
```

### Method 2: Manual Build and Deploy
```bash
# Navigate to frontend directory
cd /home/rafael/Documents/BewareOfTheRocks/frontend

# Install dependencies (if needed)
npm install

# Build the app
npm run build

# Deploy using gh-pages package
npm run deploy
```

## 🔍 Monitoring Deployment

1. **Check GitHub Actions**: 
   - Go to: https://github.com/BewareOfTheRocks/BewareOfTheRocks.github.io/actions
   - Look for your latest workflow run
   - Green checkmark = successful deployment
   - Red X = failed deployment (check logs)

2. **Check GitHub Pages Settings**:
   - Go to: Settings → Pages
   - Should show: "Your site is live at https://bewareoftherocks.github.io"
   - Source should be: "GitHub Actions"

## 🛠 Troubleshooting

### Site Not Updating?
1. Check if GitHub Actions workflow completed successfully
2. Clear browser cache (Ctrl+F5 or Cmd+Shift+R)
3. Wait 5-10 minutes for GitHub Pages CDN to update

### Build Failing?
1. Check the Actions tab for error logs
2. Test locally with `npm run build` in `/frontend`
3. Fix any compilation errors
4. Commit and push again

### 404 Errors on Routes?
- GitHub Pages doesn't support client-side routing by default
- The app uses React Router with BrowserRouter which should work
- If issues persist, may need to add a 404.html that redirects to index.html

## 📁 Project Structure

```
BewareOfTheRocks.github.io/
├── .github/workflows/deploy.yml  # GitHub Actions workflow
├── frontend/                     # React app source
│   ├── src/                     # React components
│   ├── public/                  # Static assets
│   ├── package.json            # Dependencies & scripts
│   └── build/                  # Generated build files (after npm run build)
├── DEPLOYMENT.md               # This file
└── README.md                   # Project documentation
```

## ⚙️ Configuration Files

### package.json (frontend)
- `homepage`: Set to `https://bewareoftherocks.github.io`
- `deploy` script: Uses `gh-pages` package for manual deployment

### GitHub Actions Workflow
- Located at: `.github/workflows/deploy.yml`
- Triggers on: Push to `main` branch
- Builds: Frontend React app
- Deploys: To GitHub Pages using official actions

## 🔗 Important URLs

- **Live Site**: https://bewareoftherocks.github.io
- **Repository**: https://github.com/BewareOfTheRocks/BewareOfTheRocks.github.io
- **Actions**: https://github.com/BewareOfTheRocks/BewareOfTheRocks.github.io/actions
- **Settings**: https://github.com/BewareOfTheRocks/BewareOfTheRocks.github.io/settings/pages

## 🎯 Quick Deploy Command

For the fastest deployment, just run:
```bash
cd /home/rafael/Documents/BewareOfTheRocks
git add . && git commit -m "Update site" && git push origin main
```

This will trigger the automatic deployment and your site will be updated in a few minutes! 🚀
