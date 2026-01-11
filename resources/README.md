# CheckSpree2 Resources

This folder contains application resources for building the production executable.

## Icon Files

### icon.ico (Windows)
- **Current file**: A placeholder icon is already present
- **Requirements**:
  - Format: .ico (Windows Icon)
  - Recommended sizes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256 pixels
  - All sizes embedded in one .ico file
  - Use for Windows installer and application icon

### Creating a Custom Icon

If you want to replace the placeholder with a professional icon:

1. **Design your icon** (square format, 256x256 or higher)
   - Use tools like Adobe Illustrator, Figma, or Inkscape
   - Keep it simple and recognizable at small sizes
   - CheckSpree2 is a check printing app - consider check/money imagery

2. **Convert to .ico format**
   - Online tools: https://convertio.co/png-ico/ or https://icoconvert.com/
   - Desktop tools: GIMP (free), Photoshop, or Icon Workshop
   - Make sure to include multiple sizes (at minimum: 16, 32, 48, 256)

3. **Replace this file**
   - Save your new icon as `icon.ico`
   - Overwrite the current placeholder file
   - Rebuild the app with `npm run build:win`

### Icon Guidelines

**Do:**
- Keep designs simple and professional
- Use high contrast for visibility at small sizes
- Test icon at 16x16 to ensure it's still recognizable
- Use appropriate business imagery (check, ledger, printer, etc.)

**Don't:**
- Use complex gradients (won't show well at small sizes)
- Include fine text (unreadable when scaled down)
- Use too many colors (keep palette simple)
- Forget to test at multiple sizes

## File Structure

```
resources/
├── icon.ico          # Windows application icon
└── README.md         # This file
```

## Build Process

The icon is referenced in `package.json` under the `build.win.icon` property. When you run `npm run build:win`, electron-builder will automatically embed this icon into:

- The installer executable (Setup.exe)
- The portable executable (CheckSpree2-Portable.exe)
- The installed application
- Desktop and Start Menu shortcuts

## Troubleshooting

**Build fails with icon error:**
- Ensure `icon.ico` exists in this folder
- Verify the .ico file isn't corrupted (try opening it in Windows)
- Make sure file has multiple sizes embedded (use an icon editor to check)

**Icon doesn't appear after build:**
- Windows caches icons - restart Explorer.exe or reboot
- Delete `dist/` folder and rebuild
- Check icon file format is correct .ico with embedded sizes
