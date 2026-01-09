# CheckSpree2

A professional check printing application built with Electron that treats printing as a **physical-units problem** for precise, reliable output.

## Core Features

### Physical-Unit Printing
- Paper and check dimensions defined in **inches**
- Field positions/sizes stored in **inches**
- Dedicated print layout with optional **PDF preview**
- Printer-specific X/Y offset calibration to ensure perfect alignment
- No fragile pixel-based templates or DPI conversions

### Multi-Ledger System
- Create and manage multiple ledgers (checking accounts)
- Track balance separately for each ledger
- Switch between ledgers instantly
- Delete ledgers with automatic check cleanup
- Rename ledgers on-the-fly

### Check Profiles
- Save and load different check configurations
- Store payee info, addresses, memo templates, and field layouts
- Quick-switch between personal, business, or other check profiles
- Profile-based breakdown in export reports

### Smart Stub System
- Dynamically add/remove stub sections:
  - **Payee Copy Stub** (Stub 1)
  - **Bookkeeper Copy Stub** (Stub 2)
- Smart field synchronization across check and stubs
- Friendly field labels on stubs for clarity
- Line item support with automatic formatting

### Check History & Ledger Tracking
- Every check automatically recorded with:
  - Transaction amount
  - Previous balance
  - New balance after check
  - Timestamp and metadata
- View complete transaction history per ledger
- Restore balance by deleting checks
- Track spending by profile and ledger

### Import/Export
- **Import**: CSV/TSV files with automatic column detection
  - Preview queue before recording
  - Bulk process or load individually
- **Export**: Enhanced CSV reports with:
  - Grand totals across selected ledgers
  - Per-ledger breakdowns (balance, total spent, check count)
  - Per-profile spending within each ledger
  - Complete check details with timestamps

### Advanced Editing
- Visual field editor with drag-and-drop
- Resize fields with handles
- Snap-to-grid positioning
- Font size scaling with global preference
- Template opacity control
- Check number auto-increment

## Installation & Setup

From the repo root:

```powershell
cd .\CheckSpree
npm install
npm run dev
```

To build for production:

```powershell
npm run build
```

## Calibration Workflow

1. **Load Template**: Upload a scanned image of your check (used as an on-screen guide only)
2. **Set Dimensions**: Configure check size in inches and page offsets
3. **Position Fields**: Use edit mode to drag and resize fields to match your template
4. **Preview PDF**: Verify alignment before printing
5. **Fine-tune**: Adjust X/Y offsets until printing is perfect on your check stock
6. **Save Profile**: Store your configuration for future use

## Usage Tips

### Ledger Management
- Start with the default "Primary Ledger"
- Add new ledgers for different accounts via the ledger manager
- Each ledger maintains its own balance and transaction history
- Export selected ledgers to CSV for accounting records

### Profile Workflow
- Create a profile for each type of check you print
- Save payee information, addresses, and custom fields
- Switch profiles to quickly fill in recurring payments
- Use profiles to categorize spending in export reports

### Stub Sections
- Add stubs only when needed (reduces paper waste)
- Stub 1 (Payee Copy): Tear-off for recipient
- Stub 2 (Bookkeeper Copy): Internal record keeping
- Both stubs auto-sync with check data
- Support for line items and GL codes

### Import Queue
- Import bulk payments from spreadsheets
- Review each check before recording
- Edit amounts or details in the queue
- Process all at once or one-by-one

## Technical Architecture

- **Electron**: Desktop app framework
- **React**: UI rendering with hooks
- **Physical Units**: All measurements in inches for print reliability
- **IPC Communication**: Secure main/renderer process communication
- **Persistent Storage**: Auto-save settings to user data folder

## Why Physical Units?

Traditional check printing apps use pixel-based templates, which fail across different screens and printers. CheckSpree2 uses inch-based measurements that translate directly to physical printer output, eliminating DPI conversion errors and ensuring consistent results.

