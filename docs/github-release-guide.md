# GitHub Release Creation Guide for FPGA Pin Planner v1.0.3

## 🚀 Manual GitHub Release Steps

### Step 1: Navigate to GitHub Repository
Visit: [https://github.com/MameMame777/FPGApinPlaner](https://github.com/MameMame777/FPGApinPlaner)

### Step 2: Create New Release
1. Click "Releases" tab (or go to `/releases`)
2. Click "Create a new release"

### Step 3: Release Configuration
- **Tag version**: `v1.0.3`
- **Release title**: `🎉 FPGA Pin Planner v1.0.3 - Latest Improvements Release`
- **Target**: `master` branch

### Step 4: Description
Copy the content from `RELEASE-NOTES-v1.0.3.md` into the description field.

### Step 5: Assets
Upload the following files:
- `vscode-extension/fpga-pin-planner-1.0.3.vsix`
- (Optional) Any additional documentation or sample files

### Step 6: Publication Options
- ✅ Set as the latest release
- ✅ Create a discussion for this release (optional but recommended)

### Step 7: Publish
Click "Publish release"

## 🤖 Alternative: GitHub CLI Method

If you have GitHub CLI installed, you can use:

```bash
# Create release with GitHub CLI
gh release create v1.0.3 \
  vscode-extension/fpga-pin-planner-1.0.3.vsix \
  --title "🎉 FPGA Pin Planner v1.0.3 - Latest Improvements Release" \
  --notes-file RELEASE-NOTES-v1.0.3.md \
  --latest
```

## 📋 Post-Release Checklist

After creating the release:

1. **Verify Release Page**: Check that all assets are uploaded correctly
2. **Update README badges**: Ensure version badges show v1.0.3
3. **Social Media**: Announce the release on relevant platforms
4. **Community Notification**: Inform users in relevant forums/channels
5. **Monitor Feedback**: Keep an eye on issues and discussions

## 🔗 Expected URLs After Release

- **Release Page**: `https://github.com/MameMame777/FPGApinPlaner/releases/tag/v1.0.3`
- **VSIX Download**: `https://github.com/MameMame777/FPGApinPlaner/releases/download/v1.0.3/fpga-pin-planner-1.0.3.vsix`

## 📊 Release Metrics to Monitor

- Download count for VSIX file
- GitHub stars and watchers
- Issues opened/closed
- VS Code Marketplace statistics
