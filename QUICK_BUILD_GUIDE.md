# Quick Build Guide - CheckSpree2

## Ready to Build? Run This:

```powershell
npm run build:win
```

That's it! This single command will:
1. ✅ Compile your React/Vite code
2. ✅ Package with Electron
3. ✅ Create Windows installer (NSIS)
4. ✅ Create portable executable

## Where's My Build?

After building (2-5 minutes), find your installers here:

```
CheckSpree/dist/
├── CheckSpree2 Setup 0.1.0.exe     ← Full installer
└── CheckSpree2-Portable.exe         ← Portable (no install)
```

## First Time Setup

If you haven't installed dependencies yet:

```powershell
npm install
```

## Security Checklist ✓

Your repository is now protected:

✅ `*.settings.json` - Never committed (user data stays local)
✅ `dist/` - Build outputs excluded from git
✅ `out/` - Compiled code excluded
✅ `.env` - Environment variables excluded
✅ Only compiled code shipped (no source in .exe)

## Quick Test

### Test the Installer:
1. Go to `dist/`
2. Run `CheckSpree2 Setup 0.1.0.exe`
3. Install and launch

### Test Portable Version:
1. Go to `dist/`
2. Copy `CheckSpree2-Portable.exe` to desktop
3. Double-click to run (no install needed!)

## Need More Info?

📖 Full documentation: [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md)

## Common Issues

**"Icon not found" error?**
→ Icon already exists at `resources/icon.ico` (you're good!)

**Build failed?**
```powershell
# Clean and rebuild
rm -rf node_modules dist out
npm install
npm run build:win
```

**Want to change the version?**
→ Edit `version` in [package.json](package.json) (currently 0.1.0)

## Your Build Configuration

```json
AppId:        com.checkspree2.app
Product:      CheckSpree2
Version:      0.1.0
Targets:      NSIS Installer + Portable EXE
Architecture: x64 (64-bit Windows)
Icon:         resources/icon.ico ✓
Output:       dist/
```

## Next Steps

1. **Build now**: `npm run build:win`
2. **Test both executables** (installer & portable)
3. **Distribute** to users or upload to file hosting
4. **Customize icon** (optional): Replace `resources/icon.ico`
5. **Update version** before next release

---

**Ready to ship! 🚀**
