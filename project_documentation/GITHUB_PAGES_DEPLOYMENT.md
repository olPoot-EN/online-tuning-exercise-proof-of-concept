# GitHub Pages Deployment Guide
## Voltage Tuning Exercise

This guide walks you through deploying the Voltage Tuning Exercise to GitHub Pages once you have admin access to your organization's repository.

## ✅ Pre-Deployment Checklist

Your setup is already optimized for GitHub Pages:

- ✅ **Application file**: `docs/index.html` (GitHub Pages ready)
- ✅ **Security manager**: Updated to allow `*.github.io` domains
- ✅ **Dependencies**: All CDN-based (no local files required)
- ✅ **Organization repository**: Transferred for publishing capabilities
- ✅ **Project documentation**: Organized in `project_documentation/`

## 🚀 Deployment Steps

### Step 1: Enable GitHub Pages (Once You Have Admin Access)

1. **Navigate to Repository Settings**
   - Go to your organization's repository
   - Click the **Settings** tab (requires admin access)

2. **Configure GitHub Pages**
   - Scroll down to **Pages** section in the left sidebar
   - Under **Source**, select **Deploy from a branch**
   - Choose **Branch**: `main` (or your default branch)
   - Choose **Folder**: `/ (root)` or `/docs` 
   - Click **Save**

### Step 2: Choose Deployment Folder

**Option A: Use `/docs` folder (Recommended)**
```
Source: Deploy from a branch
Branch: main
Folder: /docs
```

**Option B: Use root folder**
- Move `docs/index.html` to root as `index.html`
```
Source: Deploy from a branch  
Branch: main
Folder: / (root)
```

### Step 3: Access Your Published Application

After enabling Pages, GitHub will provide your URL:

**Format**: `https://[ORGANIZATION-NAME].github.io/voltage-tuning-exercise/`

**Example**: If your org is "MyPowerCompany":
- URL: `https://mypowercompany.github.io/voltage-tuning-exercise/`

### Step 4: Verify Deployment

1. **Check build status**
   - Go to **Actions** tab in repository
   - Look for "pages-build-deployment" workflow
   - Ensure it completes successfully (green checkmark)

2. **Test the application**
   - Visit your GitHub Pages URL
   - Verify the application loads and initializes
   - Test voltage control functionality
   - Confirm charts display properly

## 🔧 Configuration Details

### Domain Security
The application's security manager already includes GitHub Pages domains:
```javascript
// Automatically allows *.github.io domains
if (window.location.hostname.endsWith('.github.io')) {
    return true;
}
```

### CDN Dependencies
All external resources load from CDNs:
- **Pyodide**: `https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js`
- **Chart.js**: `https://cdn.jsdelivr.net/npm/chart.js`

### HTTPS Enforcement
GitHub Pages automatically provides HTTPS, which is required for:
- Pyodide WebAssembly modules
- Modern browser security policies
- Professional deployment standards

## 🌐 Custom Domain (Optional)

If your organization wants a custom domain:

1. **Add custom domain**
   - In Pages settings, enter your domain (e.g., `training.mycompany.com`)
   - GitHub will create a CNAME file

2. **DNS Configuration**
   - Add CNAME record pointing to `[org-name].github.io`
   - GitHub will handle SSL certificate automatically

3. **Enforce HTTPS**
   - Check "Enforce HTTPS" option in Pages settings

## 📋 Post-Deployment Actions

### Testing Checklist
- [ ] Application loads without errors
- [ ] Pyodide initializes successfully  
- [ ] Voltage controls are responsive
- [ ] Charts render and update in real-time
- [ ] Parameter adjustments work correctly
- [ ] Simulation reset functions properly
- [ ] Mobile/tablet compatibility

### Performance Monitoring
- **Load Time**: Should be <10 seconds on first visit
- **Cached Load**: Should be <3 seconds on repeat visits
- **Real-time Updates**: 50ms intervals maintained
- **Memory Usage**: Stable during extended operation

### User Access
- **Internal Access**: Share GitHub Pages URL with training participants
- **Documentation**: Provide user guide and troubleshooting steps
- **Support**: Establish contact for technical issues

## 🔄 Updates and Maintenance

### Content Updates
1. **Edit files** in your local repository
2. **Commit changes** to main branch
3. **Push to GitHub** - Pages automatically rebuilds
4. **Verify deployment** - Check Actions tab for build status

### Version Management
```bash
# Tag releases for version tracking
git tag -a v1.0 -m "Phase 1 Release"
git push origin v1.0
```

### Rollback Process
If issues arise:
1. **Revert commit** in GitHub interface
2. **Pages rebuilds** automatically
3. **Previous version** restored within minutes

## 🐛 Troubleshooting

### Common Issues

**1. Page Shows 404 Error**
- Verify `docs/index.html` exists in repository
- Check Pages source folder setting matches your structure
- Ensure branch is correct (usually `main`)

**2. Application Won't Load**
- Check browser developer console for errors
- Verify CDN resources are loading (network tab)
- Confirm HTTPS is being used (required for Pyodide)

**3. Build Failures**
- Check Actions tab for build logs
- Look for file name case sensitivity issues
- Verify no special characters in file names

**4. Slow Loading**
- Monitor CDN performance (Pyodide is ~10MB download)
- Consider implementing loading progress indicator
- Check if corporate firewall blocks CDN access

### Debug Steps
1. **Test locally**: Open `docs/index.html` in browser using `file://`
2. **Check console**: Look for JavaScript errors in browser dev tools
3. **Network analysis**: Monitor resource loading in Network tab
4. **GitHub Status**: Check if GitHub Pages service has issues

### Support Resources
- **GitHub Pages Documentation**: https://docs.github.com/pages
- **Repository Issues**: Use GitHub Issues for bug reports
- **Organization Admin**: Contact for access and permissions issues

## 📞 Contact Information

**For Deployment Issues**:
- Repository admin contact
- IT support for DNS/domain configuration

**For Application Issues**:
- Development team contact
- Training coordinator

---

**Document Status**: Ready for deployment  
**Last Updated**: Current  
**Version**: 1.0 - GitHub Pages Ready