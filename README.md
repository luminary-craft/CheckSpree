# CheckSpree

A professional check printing application built with Electron that treats printing as a **physical-units problem** for precise, reliable output.

## Table of Contents
- [Core Features](#core-features)
- [Installation & Setup](#installation--setup)
- [Getting Started](#getting-started)
- [Key Features Explained](#key-features-explained)
- [Calibration Workflow](#calibration-workflow)
- [Usage Guide](#usage-guide)
- [Technical Architecture](#technical-architecture)
- [Security Features](#security-features)

## Core Features

### Physical-Unit Printing
- Paper and check dimensions defined in **inches** (not pixels)
- Field positions/sizes stored in **inches** for print reliability
- Dedicated print layout with optional **PDF preview**
- Printer-specific X/Y offset calibration to ensure perfect alignment
- Draggable fold lines for stub positioning
- Snap-to-grid field placement (0.125-inch grid)
- No fragile pixel-based templates or DPI conversions

### Multi-Ledger System
- Create and manage multiple ledgers (checking accounts)
- Track balance separately for each ledger
- Switch between ledgers instantly with dropdown selector
- Delete ledgers with automatic check history cleanup
- Rename ledgers on-the-fly
- View projected balance before recording check
- Overdraft warnings when balance would go negative
- **Global Permissions**: Admin can toggle "Allow standard users to manage ledgers"
- **Auto-Routing**: Imports with a "Ledger" column automatically route transactions to the correct ledger
- **Auto-Creation**: New ledgers are created automatically during import if they don't exist

### Check Profiles
- Save and load different check configurations
- Store payee info, addresses, memo templates, and field layouts
- Quick-switch between personal, business, or other check profiles
- Profile-based spending breakdown in export reports
- Delete profiles with confirmation
- Duplicate profiles for similar configurations

### Smart Stub System
- Dynamically add/remove stub sections:
  - **Payee Copy Stub** (Stub 1)
  - **Bookkeeper Copy Stub** (Stub 2)
- Smart field synchronization across check and stubs
- Friendly field labels on stubs for clarity
- Line item support with automatic formatting
- Draggable fold lines to adjust stub heights
- Stub-specific fields automatically reposition with fold adjustments

### Check History & Ledger Tracking
- Every check automatically recorded with:
  - Transaction amount (formatted with thousands separators)
  - Previous balance
  - New balance after check
  - Timestamp and full metadata
  - Associated ledger and profile
- View complete transaction history per ledger
- Restore balance by deleting checks from history
- **Robust Ledger Integrity**: Ledger deduction and history recording only occur AFTER confirmed successful print or PDF save
- Track spending by profile and ledger
- Recent activity preview in sidebar (last 2 checks)

### Import/Export
- **Import**: CSV/TSV/Excel (.xlsx/.xls) files with automatic column detection
  - Preview queue before recording
  - Bulk process or load individually
  - Column mapping with auto-detection
  - Queue persists between sessions
  - Edit amounts or details in queue before processing
  - **CSV Template**: Downloadable template to ensure correct formatting
  - **Multi-Ledger Support**: "Ledger" column automatically assigns transactions

- **Export**: Enhanced CSV reports with:
  - Grand totals across selected ledgers
  - Per-ledger breakdowns (balance, total spent, check count)
  - Per-profile spending within each ledger
  - Complete check details with timestamps and balance after
  - Date range filtering (all time, custom range, this week, last month, etc.)
  - Automatic file location reveal after export

### Advanced Editing
- Visual field editor with drag-and-drop positioning
- Resize fields with corner handles
- Snap-to-grid positioning (toggle on/off, 0.125-inch increments)
- Font size scaling with global preference (8pt - 24pt)
- Template opacity control for alignment
- Check number auto-increment
- Admin lock/unlock for settings protection
- Field type support: text, textarea, date, amount
- Custom field creation and deletion
- **Multi-Select**: Hold Ctrl/Shift to select multiple fields
- **Marquee Selection**: Drag a box on the background to select multiple fields
- **Group Dragging**: Move multiple selected fields simultaneously
- **Independent Display Toggles**: Show/Hide Check Number and Date independently in all modes, including 3-Up layout
- **Batch Print Error Handling**: Pauses on failure with options to Skip & Continue or Stop Batch, ensuring no checks are recorded if they didn't physically print

### Backup & Restore
- One-click backup of all application data
- Export to portable JSON format
- Includes all ledgers, profiles, check history, and settings
- **Encrypted Backups**: Secure your data with a user-generated password
- Auto-upgrade from legacy plain-text format

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher recommended)
- npm (comes with Node.js)

### From the repo root:

```powershell
cd .\CheckSpree
npm install
npm run dev
```

### To build for production:

```powershell
npm run build
npm start
```

### To package as a distributable app:

```powershell
npm run electron
```

## Getting Started

### Initial Setup
1. Launch the application
2. The default "Primary Ledger" will be created with a $0.00 balance
3. Set your starting balance via the ledger manager (click ledger name in top bar)
4. Upload a check template image for visual alignment (optional but recommended)

### First Check
1. Fill in payee information
2. Enter amount (automatically formatted with commas)
3. Add memo or date as needed
4. Click "Preview & Record" to see what will print
5. Use "Print Check" to send to your printer
6. Check is automatically recorded in history with updated balance

## Key Features Explained

### Physical-Unit Precision
Traditional check printing apps use pixel-based templates, which fail across different screens and printers. CheckSpree2 uses inch-based measurements that translate directly to physical printer output, eliminating DPI conversion errors and ensuring consistent results.

**Benefits:**
- Works on any screen resolution
- Printer-agnostic alignment
- Mathematical precision for field placement
- Easy calibration with X/Y offsets

### Ledger Management
Think of ledgers as different checking accounts. Each ledger:
- Maintains its own balance
- Has independent transaction history
- Can be exported separately or together
- Supports the same profiles and check templates

**Use Cases:**
- Personal vs. Business checking accounts
- Multiple bank accounts
- Petty cash vs. main operating account
- Trust accounts or client funds

### Profile System
Profiles store complete check configurations including:
- Payee and address information
- Memo templates
- Custom field values
- Field positions and sizes

**Use Cases:**
- Monthly rent payments
- Regular vendor payments
- Different business entities
- Recurring utility bills

### Import Queue
The import queue lets you:
1. Load checks from a CSV/Excel file
2. Preview all entries before recording
3. Edit or remove items
4. Process individually or in bulk
5. Auto-assigns to current ledger

**CSV Format:**
- Automatically detects columns (payee, amount, date, memo, etc.)
- Flexible column ordering
- Supports Excel files (.xlsx/.xls) and text formats (.csv, .tsv, .txt)
- Column mapping interface for custom formats

### Export Reports
Export generates comprehensive accounting reports:

**Summary Section:**
- Export date and time
- Total checks across selected ledgers
- Total amount spent
- Combined ledger balance

**Ledger Breakdown:**
- Current balance per ledger
- Total spent from each ledger
- Check count per ledger
- Profile-level spending within each ledger

**Check Details:**
- Full transaction log with all fields
- Timestamps for audit trail
- Balance after each check
- Ledger and profile associations

### Stub Configuration
Stubs are optional tear-off sections below the main check:

**Stub 1 (Payee Copy):**
- Given to the check recipient
- Shows amount, date, memo
- Can include line items for invoices

**Stub 2 (Bookkeeper Copy):**
- Retained for internal records
- Matches Stub 1 information
- Supports GL codes and line items

**Draggable Fold Lines:**
- Visual blue dashed lines in edit mode
- Drag to adjust stub heights (2.5" - 4.0" range)
- Stub fields automatically move with their section
- Non-printing guides

### Field Types
- **Text**: Single-line input (payee, address, memo)
- **Textarea**: Multi-line input (line items, notes)
- **Date**: Formatted based on preferences (MM/DD/YYYY, DD/MM/YYYY, etc.)
- **Amount**: Numeric with automatic comma formatting (1,250.00)

### Date Formatting
Choose your preferred date format in Admin Settings:
- MM/DD/YYYY (US format)
- DD/MM/YYYY (European format)
- YYYY-MM-DD (ISO format)

### Number Formatting
All amount fields automatically display with:
- Thousands separators (commas)
- Two decimal places
- Consistent formatting on check face and stubs

## Calibration Workflow

### Step-by-Step Setup
1. **Upload Template**
   - Scan or photograph a blank check
   - Click "Select Template" in Edit Layout mode
   - Template appears as background overlay

2. **Set Page Dimensions**
   - Default: 8.5" x 11" Letter size
   - Adjust if using custom check stock
   - Set page margins (left/top offsets)

3. **Configure Check Layout**
   - Check height: Distance from top to fold line (default 3.0")
   - Stub heights: Adjust using draggable fold lines
   - Enable/disable stubs as needed

4. **Position Fields**
   - Enter Edit Layout mode
   - Drag fields to match template
   - Resize with corner handles
   - Use snap-to-grid for uniform spacing

5. **Test Print**
   - Use "Preview PDF" to check alignment
   - Print to regular paper first
   - Hold up to light with actual check to verify
   - Adjust X/Y offsets as needed

6. **Fine-Tune Offsets**
   - Printer X Offset: Left/right adjustment
   - Printer Y Offset: Up/down adjustment
   - Typical values: -0.25" to +0.25"
   - Save calibration in profile

7. **Save Configuration**
   - Create a profile for this check type
   - Name it descriptively (e.g., "Business - Wells Fargo")
   - Template and layout saved with profile

## Usage Guide

### Daily Operations

#### Writing a Check
1. Select ledger (if multiple)
2. Select profile (if saved)
3. Enter payee and amount
4. Add memo, date, or other details
5. Preview to verify
6. Print and record

#### Managing Ledgers
- **Create**: Click "+" next to ledger dropdown
- **Switch**: Select from dropdown in top bar
- **Rename**: Click ledger name, edit, save
- **Delete**: Ledger manager → Delete (removes all associated checks)
- **Set Balance**: Edit directly in ledger manager

#### Working with Profiles
- **Create**: Admin Settings → Profiles → New Profile
- **Load**: Select from "Load Profile" dropdown
- **Update**: Make changes, click "Update Profile"
- **Delete**: Profile manager → Delete Profile

#### Import Workflow
1. Click "Import CSV/Excel"
2. Select file from computer
3. Map columns if needed
4. Review queue entries
5. Edit any incorrect values
6. Click "Record All" or process individually
7. Queue persists until processed or cleared

#### Export Workflow
1. Click "Export History"
2. Select ledgers to include
3. Choose date range
4. Click "Export to CSV"
5. File automatically opens in file browser

### Admin Features

#### Accessing Admin Settings
- Click "Admin" in top bar
- Enter password (default: none, set in preferences)
- Lock when done for security

#### Admin Capabilities
- Create/edit/delete profiles
- Create/edit/delete ledgers
- Adjust global preferences
- Backup/restore application data
- Clear all data (with confirmation)

#### Security Settings
- Set admin password
- Lock admin on startup (forced for security)
- Encrypted storage for sensitive data

### Preferences

#### Appearance
- Template opacity (0% - 100%)
- Font size (8pt - 24pt)
- Date format selection

#### Behavior
- Enable/disable snap-to-grid
- Check number auto-increment
- Stub visibility toggles

#### Calibration
- Printer X/Y offsets
- Page margins
- Paper size

## Technical Architecture

### Technology Stack
- **Electron 33.x**: Cross-platform desktop framework
- **React 19.x**: UI component library with hooks
- **Vite 7.x**: Fast development server and bundler
- **xlsx**: Excel file parsing

### Project Structure
```
CheckSpree/
├── src/
│   ├── main/          # Electron main process
│   │   └── index.js   # IPC handlers, file I/O, settings
│   ├── preload/       # Secure IPC bridge
│   │   └── index.js   # Context bridge API
│   └── renderer/      # React UI
│       ├── App.jsx    # Main application component
│       ├── index.html # HTML entry point
│       └── styles.css # Global styles
├── package.json       # Dependencies and scripts
└── README.md          # This file
```

### IPC Communication
The app uses Electron's contextBridge for secure IPC:

**Main Process** (Node.js environment):
- File system operations
- Settings encryption/decryption
- Print dialog handling
- File picker dialogs

**Renderer Process** (Browser environment):
- React UI rendering
- User interactions
- State management
- Print preview generation

**Preload Script** (Bridge):
- Exposes safe APIs to renderer
- No direct Node.js access in renderer
- Context isolation enabled

### Data Persistence
Settings are stored in the user data folder:
- **Windows**: `%APPDATA%/checkspree2/checkspree2.settings.json`
- **macOS**: `~/Library/Application Support/checkspree2/checkspree2.settings.json`
- **Linux**: `~/.config/checkspree2/checkspree2.settings.json`

### State Management
React hooks for local state:
- `useState` for UI state
- `useEffect` for side effects and persistence
- Debounced saves for non-critical data
- Immediate saves for financial data (balances, checks, queue)

### Print Architecture
1. User clicks Print
2. React renders print-specific view
3. CSS `@media print` rules activate
4. Electron's `webContents.print()` invokes native print dialog
5. Physical measurements ensure 1:1 inch accuracy

## Security Features

### Data Encryption
- Settings encrypted at rest using Electron's `safeStorage`
- Automatic encryption when available on system
- Graceful fallback to plain text if unavailable
- Legacy data auto-upgraded to encrypted format
- **Manual Backup Encryption**: User-defined passwords for portable backup files

### Admin Protection
- Password-protected admin access
- Admin auto-locks on startup
- All sensitive operations behind admin lock
- Profile and ledger deletion require admin access

### Data Integrity
- Automatic backup functionality
- Transaction history immutable once recorded
- Balance calculations double-checked
- Validation on all financial inputs
- **Confirmed-Print Logic**: Prevents "ghost" transactions by only committing to the ledger after the printer or PDF engine confirms success
- **Batch Pause-on-Error**: Allows manual intervention if a printer jams or a save fails mid-batch

### Privacy
- All data stored locally
- No cloud sync or external services
- No telemetry or usage tracking
- No internet connection required

## Troubleshooting

### Alignment Issues
**Problem**: Check prints off-center or misaligned
**Solution**:
- Verify template is correctly positioned
- Adjust Printer X/Y offsets in small increments (0.05")
- Test on plain paper before using check stock
- Ensure printer settings match (no scaling, 100% size)

### Import Not Working
**Problem**: CSV file doesn't import correctly
**Solution**:
- Verify file has headers (payee, amount, date, etc.)
- Check for proper CSV formatting (commas, not tabs)
- Use column mapping feature for custom formats
- Try Excel format (.xlsx) if CSV parsing fails

### Balance Discrepancies
**Problem**: Ledger balance doesn't match bank
**Solution**:
- Review check history for missed transactions
- Verify starting balance in ledger manager
- Check for deleted entries that should be recorded
- Export history to CSV for detailed audit

### PDF Preview Issues
**Problem**: PDF preview doesn't open
**Solution**:
- Check system PDF viewer is installed
- Try printing directly instead
- Verify temp folder permissions
- Restart application

### Performance Issues
**Problem**: Application runs slowly
**Solution**:
- Clear old check history (export first for records)
- Reduce template image size/resolution
- Close other applications
- Restart Electron app

## License

This project is private and proprietary. All rights reserved.

## Support

For issues or questions:
1. Check this README first
2. Review the in-app admin settings
3. Test with the default profile/ledger
4. Export your data as backup before major changes

---

**Version**: 0.3.0
**Last Updated**: January 2026
**Built with**: Electron, React, and attention to detail
