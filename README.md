# CheckSpree
> **Note:** This is a proprietary application. Source code is provided for inspection and educational purposes only.

A professional check printing and financial tracking application built with Electron that treats printing as a **physical-units problem** for precise, reliable output.

## Table of Contents
- [Core Features](#core-features)
- [Installation & Setup](#installation--setup)
- [Getting Started](#getting-started)
- [Key Features Explained](#key-features-explained)
- [Calibration Workflow](#calibration-workflow)
- [Usage Guide](#usage-guide)
- [Technical Architecture](#technical-architecture)
- [Security Features](#security-features)
- [Internationalization](#internationalization)
- [Troubleshooting](#troubleshooting)

## Core Features

### Physical-Unit Printing
- Paper and check dimensions defined in **inches** (not pixels)
- Field positions/sizes stored in **inches** for print reliability
- Dedicated print layout with optional **PDF preview**
- Printer-specific X/Y offset calibration for perfect alignment
- Draggable fold lines for stub positioning
- Snap-to-grid field placement (0.125-inch grid)
- No fragile pixel-based templates or DPI conversions

### Internationalization (i18n)
- **5 supported regions**: US, Canada, UK, France, Philippines
- **Paper size auto-detection**: Letter (8.5x11") for US/CA/PH, A4 (8.27x11.69") for GB/FR
- **Locale-aware currency**: $, CAD, GBP, EUR, PHP with proper formatting
- **Dynamic canvas**: Paper dimensions, check heights, and stub proportions auto-adjust per region
- **Number-to-words**: Locale-aware check amount conversion (extensible language registry)
- **Date formatting**: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD per locale
- **Region selector**: Choose during Setup Wizard or change anytime in Settings

### Multi-Ledger System
- Create and manage multiple ledgers (checking accounts)
- Track balance separately for each ledger using hybrid balance calculation
- Switch between ledgers instantly with dropdown selector
- Delete ledgers with automatic check history cleanup
- Rename ledgers on-the-fly
- View projected balance before recording check
- Overdraft warnings when balance would go negative
- **Global Permissions**: Admin can toggle "Allow standard users to manage ledgers"
- **Auto-Routing**: Imports with a "Ledger" column automatically route transactions to the correct ledger
- **Auto-Creation**: New ledgers are created automatically during import if they don't exist
- **Manual Adjustments**: Add deposits or adjustments with reason/notes for audit trail
- **Total Balance View**: Top bar shows combined balance across all ledgers
- **Dual History Views**: "All History" shows all ledgers, "Ledger History" filters to current ledger

### Check Profiles
- Save and load different check configurations
- Store payee info, addresses, memo templates, and field layouts
- Quick-switch between personal, business, or other check profiles
- Profile-based spending breakdown in export reports
- Delete profiles with confirmation
- Duplicate profiles for similar configurations

### Vendor Database
- **Contact management**: Store vendor name, address, phone, email, tax ID, and notes
- **Auto-fill**: Type a vendor name in the payee field and select from dropdown to auto-fill address and default GL code
- **1099 tracking**: Mark vendors as 1099-eligible for year-end tax reporting
- **Form 1099 generation**: Automatically tallies payments per vendor per year with threshold filtering
- **Spending insights**: Reports panel breaks down spending by vendor

### Digital Signature
- **Draw signatures**: Freehand signature pad with adjustable pen width and color
- **Draggable field**: Signature appears as a positioned field on the check canvas
- **Per-profile storage**: Each check profile stores its own signature
- **Edit mode support**: Reposition and resize signature like any other field

### Invoice Generator
- **Create invoices**: Full invoice creation with line items, tax, discounts
- **Status tracking**: Draft, Sent, Paid, Overdue, Cancelled statuses
- **Overdue detection**: Automatic overdue badge in top bar
- **Print support**: Print invoices with professional formatting
- **Invoice numbering**: Auto-incrementing invoice numbers

### Smart Stub System
- Dynamically add/remove stub sections:
  - **Payee Copy Stub** (Stub 1)
  - **Bookkeeper Copy Stub** (Stub 2)
- Smart field synchronization across check and stubs
- Friendly field labels on stubs for clarity
- Line item support with automatic formatting
- Draggable fold lines to adjust stub heights
- Stub-specific fields automatically reposition with fold adjustments
- **Independent Date Display**: Each stub can show/hide date independently
- **Address Fields**: Full address field support on stubs

### Check History & Ledger Tracking
- Every check automatically recorded with:
  - Transaction amount (formatted with locale-aware separators)
  - Previous balance and new balance after check
  - Precise timestamp with time recorded for accurate sorting
  - Associated ledger and profile
  - GL Code and description (if configured)
- View complete transaction history per ledger or across all ledgers
- Restore balance by deleting checks from history
- **Confirmed-Print Logic**: Only commits to ledger after printer/PDF engine confirms success
- **Income/Deposit Support**: Record deposits with green positive indicators
- **Filter & Search**: Search history by payee, filter by GL Code

### Import/Export
- **Import**: CSV/TSV/Excel (.xlsx/.xls) files with automatic column detection
  - Preview queue before recording
  - Bulk process or load individually
  - Column mapping with auto-detection
  - Queue persists between sessions
  - Edit amounts or details in queue before processing
  - **CSV Template**: Downloadable template to ensure correct formatting
  - **Multi-Ledger Support**: "Ledger" column automatically assigns transactions

- **Export**: Enhanced reports with locale-aware currency formatting:
  - Grand totals across selected ledgers
  - Per-ledger breakdowns (balance, total spent, check count)
  - Per-profile spending within each ledger
  - Complete check details with timestamps and balance after
  - GL Code and description columns
  - Date range filtering and sort options
  - **PDF Export**: Professional styled PDF reports
  - **CSV Export**: Accounting-ready CSV with summary sections

### Advanced Editing
- Visual field editor with drag-and-drop positioning
- Resize fields with corner handles
- Snap-to-grid positioning (toggle on/off, 0.125-inch increments)
- Font size scaling with global preference (8pt - 24pt)
- Template opacity control for alignment (default 90%)
- Check number auto-increment
- Admin lock/unlock for settings protection
- **Multi-Select**: Hold Ctrl/Shift to select multiple fields
- **Marquee Selection**: Drag a box on the background to select multiple fields
- **Group Dragging**: Move multiple selected fields simultaneously
- **Quick Delete**: Toggle fields off directly from the canvas
- **Expandable Fields**: Text fields expand to prevent content cutoff
- **Batch Print Error Handling**: Pauses on failure with Skip & Continue or Stop Batch options

### GL Code System
- Assign GL (General Ledger) codes to transactions for accounting categorization
- GL Code descriptions for human-readable labeling
- GL Code filtering in history and export views
- Automatic GL Code propagation across check, stubs, and history
- Export reports include GL Code data for accounting integration
- Sort and filter exports by GL Code

### 3-Up Layout Mode
- Print 3 checks per page for high-volume operations
- Independent slot management (fill slots 1, 2, or 3)
- Auto-increment check numbers across all slots
- Combined Show Check Number & Auto-increment toggle
- Admin-controlled cut lines for print guidance
- Import queue integration with multi-select (up to 3 items)
- Batch printing with progressive ledger deductions
- Address and GL Code fields supported in all slots

### Expansion Modules
- **Bank Reconciliation**: Match cleared/outstanding transactions against statement balance
- **Recurring Checks**: Schedule repeating payments with frequency, due-date alerts, and generate-to-fill
- **Check Approvals**: Configurable threshold-based approval workflow with submit/approve/reject
- **Reports Dashboard**: 4-tab reporting (Dashboard stats, Check Register, Spending Summaries, Void Report)
- **Positive Pay Export**: Generate bank-compatible positive pay files for fraud prevention

### Backup & Restore
- One-click backup of all application data
- Export to portable JSON format
- Includes all ledgers, profiles, check history, vendors, and settings
- **Encrypted Backups**: Secure your data with a user-generated password
- **Auto-Backup**: Debounced automatic backups with Time Machine-style retention policy
- **Smart Pruning**: Keeps all backups for 3 days, daily for 1 year, weekly for 3 years, quarterly beyond
- Auto-upgrade from legacy plain-text format

### Auto-Updater
- Automatic update checks on startup (production builds)
- Download progress indicator
- One-click install and restart
- Non-intrusive notification banner

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

### First Launch
1. Launch the application
2. The **Setup Wizard** guides you through:
   - **Welcome** screen
   - **Region** selection (US, CA, GB, FR, PH) -- sets paper size, currency, date format
   - **Ledger** setup with name and starting balance
   - **Theme** selection (Dark, Light, or Glass with 5 accent colors)
   - **Tour** showing key features
   - **Ready** confirmation with summary
3. Upload a check template image for visual alignment (optional but recommended)

### First Check
1. Fill in payee information (vendor autocomplete suggests saved vendors)
2. Enter amount (ATM-style input: typing "123" shows $1.23)
3. Add memo or date as needed
4. Click "Preview" to see what will print
5. Use "Print & Record" to send to your printer
6. Check is automatically recorded in history with updated balance

## Key Features Explained

### Physical-Unit Precision
Traditional check printing apps use pixel-based templates, which fail across different screens and printers. CheckSpree uses inch-based measurements that translate directly to physical printer output, eliminating DPI conversion errors and ensuring consistent results.

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
- Digital signature

**Use Cases:**
- Monthly rent payments
- Regular vendor payments
- Different business entities
- Recurring utility bills

### Vendor Database
The vendor database is a persistent contact book for your payees:
- **Create vendors** in the Vendor panel (Tools menu) with name, address, tax ID, default GL code
- **Auto-fill checks**: Typing a vendor name in the payee field triggers autocomplete -- selecting a vendor fills in address and GL code automatically
- **1099 tracking**: Vendors marked as 1099-eligible have payments automatically tallied for year-end reporting
- **Form 1099 generation**: View and export 1099 data with configurable threshold (default $600)

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
- Total amount spent (locale-formatted)
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
- Drag to adjust stub heights
- Stub fields automatically move with their section
- Non-printing guides

### Field Types
- **Text**: Single-line input (payee, address, memo)
- **Textarea**: Multi-line input (line items, notes)
- **Date**: Formatted based on locale preferences
- **Amount**: ATM-style input with locale-aware formatting
- **Signature**: Freehand drawn signature stored per-profile

### Date Formatting
Date format is set automatically by region:
- **US/PH**: MM/DD/YYYY
- **GB/FR**: DD/MM/YYYY
- **CA**: YYYY-MM-DD

### Number Formatting
All amount fields display with:
- Locale-appropriate thousands separators
- Two decimal places
- Locale currency symbol prefix

## Calibration Workflow

### Step-by-Step Setup
1. **Upload Template**
   - Scan or photograph a blank check
   - Click "Select Template" in Edit Layout mode
   - Template appears as background overlay

2. **Region sets paper dimensions automatically**
   - US/CA/PH: 8.5" x 11" Letter
   - GB/FR: 8.27" x 11.69" A4
   - Check and stub heights proportionally adjusted

3. **Configure Check Layout**
   - Check height: Distance from top to fold line
   - Stub heights: Adjust using draggable fold lines
   - Enable/disable stubs as needed

4. **Position Fields**
   - Enter Edit Layout mode (Admin menu)
   - Drag fields to match template
   - Resize with corner handles
   - Use snap-to-grid for uniform spacing

5. **Test Print**
   - Use "Preview" to check alignment
   - Print to regular paper first
   - Hold up to light with actual check to verify
   - Adjust X/Y offsets as needed

6. **Fine-Tune Offsets**
   - Printer X Offset: Left/right adjustment
   - Printer Y Offset: Up/down adjustment
   - Typical values: -0.25" to +0.25"

7. **Save Configuration**
   - Create a profile for this check type
   - Name it descriptively (e.g., "Business - Wells Fargo")
   - Template and layout saved with profile

## Usage Guide

### Daily Operations

#### Writing a Check
1. Select ledger (if multiple)
2. Select profile (if saved)
3. Enter payee (vendor autocomplete fills address/GL)
4. Enter amount
5. Add memo, date, or other details
6. Preview to verify
7. Print and record

#### Managing Ledgers
- **Create**: Click "+" next to ledger dropdown
- **Switch**: Select from dropdown in top bar
- **Rename**: Click ledger name, edit, save
- **Delete**: Ledger manager, Delete (removes all associated checks)
- **Set Balance**: Edit directly in ledger manager

#### Working with Profiles
- **Create**: Admin Settings, Profiles, New Profile
- **Load**: Select from "Load Profile" dropdown
- **Update**: Make changes, click "Update Profile"
- **Delete**: Profile manager, Delete Profile

#### Working with Vendors
- **Create**: Tools menu, Vendors, Add Vendor
- **Auto-fill**: Start typing vendor name in payee field, select from dropdown
- **1099 Report**: Tools menu, Form 1099 to view annual vendor payment totals

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
4. Choose format (CSV or PDF)
5. Click "Export"
6. File automatically opens in file browser

### Admin Features

#### Accessing Admin
- Click the lock icon ("Admin") in top bar -- single click opens unlock dialog
- Enter PIN to unlock
- Click the unlocked Admin dropdown to access admin tools
- Lock with one click when done

#### Admin Capabilities
- Edit Layout mode with field positioning
- Backup/restore application data
- Snap-to-grid toggle
- Reset layout to defaults

#### Security Settings
- Set admin PIN
- Admin auto-locks on startup
- Encrypted storage for sensitive data

### Preferences

#### Appearance
- **Themes**: Dark, Light, Glass (frosted glass effects)
- **Accent Colors**: Amber, Blue, Emerald, Rose, Purple
- Template opacity (0% - 100%)
- Font size (8pt - 24pt)

#### Region
- Select locale (US, CA, GB, FR, PH)
- Automatically configures paper size, currency, date format

#### Calibration
- Printer X/Y offsets
- Page margins
- Paper size (auto-set by region)

## Technical Architecture

### Technology Stack
- **Electron 33.x**: Cross-platform desktop framework
- **React 19.x**: UI component library with hooks
- **Vite 7.x**: Fast development server and bundler
- **Vitest**: Test framework (226 tests across 9 test files)
- **xlsx**: Excel file parsing

### Project Structure
```
CheckSpree/
+-- src/
|   +-- config/            # Locale definitions
|   |   +-- locales.js     # Region configs (paper, currency, date, i18n)
|   +-- main/              # Electron main process
|   |   +-- index.js       # IPC handlers, file I/O, settings, print, backup
|   +-- preload/           # Secure IPC bridge
|   |   +-- index.js       # Context bridge API
|   +-- shared/            # Code shared between main & renderer
|   |   +-- numberToWords.js  # Locale-aware number-to-words conversion
|   +-- renderer/          # React UI
|       +-- App.jsx        # Main application component
|       +-- styles.css     # Global styles (~5000 lines, 3 themes)
|       +-- components/
|       |   +-- TopBar.jsx, Sidebar.jsx, CheckCanvas.jsx
|       |   +-- PayeeAutocomplete.jsx, AtmCurrencyInput.jsx
|       |   +-- ThemePicker.jsx, GlCodeInput.jsx
|       |   +-- modals/    # 20+ modal components
|       |   +-- vendors/   # VendorPanel, VendorForm
|       |   +-- signature/ # SignatureCanvas, SignaturePad
|       +-- hooks/         # Custom React hooks
|       |   +-- useLayoutEditor, useBatchPrint, useVendors
|       |   +-- useApprovals, useRecurringChecks, useInvoices
|       |   +-- usePersistenceSaver, useAutoIncrement, useSignature
|       +-- constants/     # Defaults, icons
|       +-- utils/         # Helpers, parsing, date, reports, invoices
+-- package.json
+-- RELEASE_NOTES.md
+-- README.md
```

### IPC Communication
The app uses Electron's contextBridge for secure IPC:

**Main Process** (Node.js environment):
- File system operations
- Settings encryption/decryption (safeStorage)
- Print dialog handling with locale page sizes
- File picker dialogs
- Auto-backup with smart pruning
- Auto-updater

**Renderer Process** (Browser environment):
- React UI rendering
- User interactions
- State management via hooks
- Locale-aware formatting

**Preload Script** (Bridge):
- Exposes safe APIs to renderer
- No direct Node.js access in renderer
- Context isolation enabled

### Data Persistence
Settings are stored in the user data folder:
- **Windows**: `%APPDATA%/checkspree2/checkspree2.settings.json`
- **macOS**: `~/Library/Application Support/checkspree2/checkspree2.settings.json`
- **Linux**: `~/.config/checkspree2/checkspree2.settings.json`

Data is encrypted at rest using Electron's `safeStorage` API with automatic legacy migration.

### State Management
React hooks for local state:
- `useState` for UI state
- `useEffect` for side effects and persistence
- `useRef` for async-loaded data synchronization
- Debounced saves for non-critical data (250ms)
- Immediate saves for financial data (balances, checks, queue)

### Print Architecture
1. User clicks Print or Preview
2. `isPrinting` flag set, React re-renders with print-optimized view
3. CSS `@media print` rules hide UI chrome, show only check
4. CSS custom properties set paper dimensions from locale (`--paper-w`, `--paper-h`)
5. Electron's `webContents.print()` or `printToPDF()` invokes output
6. `pageSize` option (Letter/A4) passed from locale config
7. Physical measurements ensure 1:1 inch accuracy

## Security Features

### Data Encryption
- Settings encrypted at rest using Electron's `safeStorage`
- Automatic encryption when available on system
- Graceful fallback to plain text if unavailable
- Legacy data auto-upgraded to encrypted format
- **Manual Backup Encryption**: User-defined passwords for portable backup files

### Admin Protection
- PIN-protected admin access (one-click lock/unlock)
- Admin auto-locks on startup
- All sensitive operations behind admin lock
- Profile and ledger deletion require admin access

### Data Integrity
- Automatic backup with Time Machine retention policy
- Transaction history immutable once recorded
- Balance calculations double-checked
- Validation on all financial inputs
- **Confirmed-Print Logic**: Prevents "ghost" transactions by only committing to the ledger after the printer or PDF engine confirms success
- **Batch Pause-on-Error**: Allows manual intervention if a printer jams or a save fails mid-batch

### Privacy
- All data stored locally
- No cloud sync or external services
- No telemetry or usage tracking
- No internet connection required (except auto-updater)

## Internationalization

CheckSpree supports 5 regions out of the box:

| Region | Paper | Currency | Date Format |
|--------|-------|----------|-------------|
| US | Letter (8.5x11") | $ USD | MM/DD/YYYY |
| Canada | Letter (8.5x11") | $ CAD | YYYY-MM-DD |
| UK | A4 (8.27x11.69") | GBP | DD/MM/YYYY |
| France | A4 (8.27x11.69") | EUR | DD/MM/YYYY |
| Philippines | Letter (8.5x11") | PHP | MM/DD/YYYY |

Changing region automatically updates:
- Canvas paper background dimensions
- Check and stub section heights (proportional to paper)
- Currency symbol and number formatting
- Date display format
- Print page size (Letter vs A4)
- Number-to-words on check face

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
- Use Bank Reconciliation (Tools menu) to match against statements
- Verify starting balance in ledger manager
- Export history to CSV for detailed audit

### PDF Preview Issues
**Problem**: PDF preview doesn't open or shows blank
**Solution**:
- Ensure region is set correctly (Settings > Region)
- Check system PDF viewer is installed
- Try printing directly instead
- Restart application

### Vendor Data Not Persisting
**Problem**: Vendors disappear after restart
**Solution**:
- Ensure you click "Save" after adding a vendor
- Check that admin is locked before closing (triggers save)
- Verify Settings file is writable

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

**Version**: 1.0.0-beta.3
**Last Updated**: February 2026
**Built with**: Electron, React, and attention to detail
