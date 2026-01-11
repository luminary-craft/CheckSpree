# CheckSpree2 - Production Build Instructions

Complete guide to building distributable Windows executables for CheckSpree2.

## Prerequisites

Ensure you have the following installed:
- **Node.js** v16 or higher
- **npm** (comes with Node.js)
- **Windows OS** (for Windows builds)

Verify installations:
```powershell
node --version
npm --version
```

## Initial Setup

If you haven't already installed dependencies:

```powershell
cd CheckSpree
npm install
```

This will install:
- Electron (desktop framework)
- React (UI library)
- Vite (build tool)
- electron-builder (packaging tool)
- All other dependencies

## Build Process

### Step 1: Build the Application Code

First, compile the React/Vite code:

```powershell
npm run build
```

This creates the `out/` directory with compiled JavaScript ready for Electron.

**Output:**
- `out/main/` - Main process code
- `out/renderer/` - Renderer process code (React UI)
- `out/preload/` - Preload bridge scripts

### Step 2: Create Windows Installers

Run the Windows build script:

```powershell
npm run build:win
```

This command:
1. Runs `npm run build` (Vite compilation)
2. Runs `electron-builder --win` (creates installers)

**Build Time:** 2-5 minutes depending on your machine

### Step 3: Locate Build Output

After successful build, find your installers in:

```
CheckSpree/
└── dist/
    ├── CheckSpree2 Setup 0.1.0.exe     # Full installer (NSIS)
    ├── CheckSpree2-Portable.exe         # Portable executable (no install)
    └── win-unpacked/                    # Unpacked files (for testing)
```

## Build Outputs Explained

### 1. CheckSpree2 Setup 0.1.0.exe (NSIS Installer)
- **Type**: Full Windows installer
- **Size**: ~150-200 MB
- **Use case**: Standard installation for end users
- **Features**:
  - Installation wizard
  - User can choose install location
  - Creates Desktop shortcut (optional)
  - Creates Start Menu shortcut
  - Adds to Windows Programs & Features
  - Includes uninstaller

**Recommended for**: Distribution to users who want a traditional install

### 2. CheckSpree2-Portable.exe
- **Type**: Standalone executable
- **Size**: ~150-200 MB
- **Use case**: Run from anywhere without installation
- **Features**:
  - No installation required
  - Run from USB drive
  - Settings stored in portable location
  - Perfect for testing or mobile use
  - No registry entries

**Recommended for**: Testing, USB deployment, or users who don't want to install

### 3. win-unpacked/ (Development Build)
- **Type**: Unpackaged application files
- **Use case**: Local testing only
- **Not for distribution**: Contains all raw files

## Build Configuration Details

The build is configured in `package.json` under the `build` section:

```json
{
  "build": {
    "appId": "com.checkspree2.app",
    "productName": "CheckSpree2",
    "directories": {
      "output": "dist"
    },
    "files": [
      "out/**/*",
      "package.json"
    ],
    "win": {
      "target": ["nsis", "portable"],
      "icon": "resources/icon.ico"
    }
  }
}
```

### Key Settings:

- **appId**: Unique identifier for the app
- **productName**: Display name shown to users
- **output**: Where installers are saved (`dist/`)
- **files**: What gets packaged (only `out/` - no source code!)
- **icon**: Application icon (Windows .ico format)
- **targets**: NSIS installer + Portable exe

## Security & Best Practices

### What Gets Excluded (via .gitignore)

✅ **Properly excluded from repository:**
- `dist/` - Build outputs (large files)
- `out/` - Compiled code
- `node_modules/` - Dependencies (reinstall via npm)
- `*.settings.json` - **CRITICAL: User data never committed!**
- `*.log` - Debug logs
- `.env` - Environment variables

### What Gets Included in Build

✅ **Packaged in the executable:**
- Compiled JavaScript (`out/`)
- Electron runtime
- React libraries
- Application icon
- package.json (for metadata)

❌ **NOT included in build:**
- Source code (`src/`)
- TypeScript/JSX files
- Development tools
- node_modules (bundled separately)

## Versioning

Update version in `package.json` before each release:

```json
{
  "version": "0.1.0"  // Change to 0.2.0, 1.0.0, etc.
}
```

Version number appears in:
- Installer filename: `CheckSpree2 Setup 0.1.0.exe`
- Windows Programs & Features
- Application "About" dialog

## Troubleshooting

### Build Fails with "icon.ico not found"

**Solution**: Ensure `resources/icon.ico` exists. A placeholder is included, but you can replace it with your custom icon.

Check icon exists:
```powershell
ls resources/icon.ico
```

### Build Fails with "Cannot find module"

**Solution**: Reinstall dependencies
```powershell
rm -rf node_modules
npm install
```

### Installer Won't Run / Windows SmartScreen Warning

**Solution**: This is normal for unsigned executables. Users must click "More info" → "Run anyway"

To remove warning (advanced):
- Purchase code signing certificate (~$300-500/year)
- Sign executable with `signtool.exe`
- Builds reputation over time with Microsoft

### Build Output is Too Large

**Solution**: This is expected. Electron bundles Chromium (~100MB) + Node.js (~30MB).

To optimize:
- Already excluded source code ✓
- Already using production build ✓
- Electron apps are typically 100-200MB

### "Out of Memory" During Build

**Solution**: Increase Node.js memory limit
```powershell
set NODE_OPTIONS=--max-old-space-size=4096
npm run build:win
```

## Testing the Build

### Test NSIS Installer
1. Navigate to `dist/`
2. Run `CheckSpree2 Setup 0.1.0.exe`
3. Install to a test location
4. Launch CheckSpree2 from Desktop/Start Menu
5. Verify all features work
6. Test uninstall via Windows Settings

### Test Portable Executable
1. Navigate to `dist/`
2. Copy `CheckSpree2-Portable.exe` to Desktop or USB drive
3. Double-click to launch
4. Verify settings persist in portable mode
5. Test on another PC (no install required)

## Distribution

### Before Distributing:

1. ✅ Test both installer and portable versions
2. ✅ Verify version number is correct
3. ✅ Check icon appears correctly
4. ✅ Test on clean Windows VM/PC
5. ✅ Scan with antivirus (false positives are common for Electron)
6. ✅ Create release notes

### How to Distribute:

**Option 1: Direct Distribution**
- Upload to file hosting (Google Drive, Dropbox, etc.)
- Share download link
- Include README with installation instructions

**Option 2: GitHub Releases**
- Tag version in git: `git tag v0.1.0`
- Push tag: `git push --tags`
- Create GitHub release
- Upload both .exe files as release assets

**Option 3: Website**
- Host on your website
- Provide download links
- Include checksums (SHA256) for security

### File Naming Convention

For releases, consider renaming for clarity:
```
CheckSpree2-v0.1.0-Setup.exe        # Installer
CheckSpree2-v0.1.0-Portable.exe     # Portable
```

## Advanced: Continuous Integration

For automated builds, you can use GitHub Actions:

**.github/workflows/build.yml** (example)
```yaml
name: Build Windows

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm run build:win
      - uses: actions/upload-artifact@v2
        with:
          name: CheckSpree2-Windows
          path: dist/*.exe
```

## Development vs. Production

### Development Mode
```powershell
npm run dev
```
- Hot reload
- DevTools open
- Source maps enabled
- Fast iteration

### Production Build
```powershell
npm run build:win
```
- Optimized code
- Minified bundles
- No source maps
- Slower build, faster runtime

## Next Steps

1. **Customize Icon**: Replace `resources/icon.ico` with your branding
2. **Update Version**: Bump to 0.2.0 or 1.0.0 when ready
3. **Sign Code**: Consider code signing for production releases
4. **Create Installer Customization**: Modify NSIS installer settings if needed
5. **Build for Other Platforms**: Add Mac/Linux targets in package.json

## Support

For build issues:
1. Check this guide first
2. Review error messages carefully
3. Ensure all dependencies installed
4. Try cleaning `out/` and `dist/` folders
5. Reinstall node_modules if needed

---

**Happy Building!**

Built with: Electron + React + electron-builder + care
