# CheckSpree Release Notes

## v1.0.0-beta.2 - The Polish & Personalization Release

This release focuses on code quality, visual refinement, theme customization, and reliability improvements across the entire application.

---

### Architecture Overhaul
- **Modular codebase**: Refactored App.jsx from a 10,703-line monolith into 68 focused modules (72% reduction), including extracted components, hooks, constants, and utilities
- **125 automated tests** across 5 test files covering defaults, helpers, date formatting, parsing, and number-to-words conversion

### Theme & Appearance
- **Dark, Light, and Glassmorphism themes**: Three full theme modes with frosted-glass backdrop effects on glass mode
- **5 accent colors**: Amber, Blue, Emerald, Rose, and Purple — fully propagated across all UI elements
- **Floating Theme Picker**: Bottom-right widget with circle toggles for quick theme mode and accent color switching
- **Warm amber design system**: 150+ hardcoded colors replaced with CSS custom properties for consistent theming throughout the app

### Check Layout
- **Perfect 1/3 stub split**: Default layout now divides the 11" page into equal thirds (3.67" / 3.67" / 3.66") with properly positioned cut lines and fields
- **Reset Layout button**: One-click reset in admin edit mode restores all field positions, section heights, and cut lines to defaults (with stub field regeneration)
- **Unsaved layout change warnings**: Confirmation dialogs with Save, Discard, and Cancel options when exiting edit mode or printing with unsaved changes
- **3-Up layout compatibility**: Three-up mode Y-offsets now dynamically reference model cut lines instead of hardcoded values

### Batch Printing Fixes
- **Fixed batch print stalling**: Resolved three bugs where batch printing stuck on the first job — missing `setIsPrinting` prop, missing `activeLedgerId` prop, and stale cancel state
- **Cancel now works reliably**: Batch cancel uses ref for immediate detection in async loops instead of stale React state

### Input & UX Improvements
- **ATM-style currency input**: All money fields use right-to-left digit entry (typing "123" shows $1.23) with automatic comma formatting
- **In-app toast notifications**: Replaced all 22 browser `alert()` calls with styled, non-blocking toast messages
- **GL Code autocomplete**: Cleaned up dropdown styling with proper CSS classes and wider dropdown for descriptions
- **Improved stub label toggles**: Pill-shaped SVG eye icon toggle replacing old emoji button
- **Itemized mode**: Wider amount column with `minmax(120px, 140px)` grid for better visibility
- **Quick Check bar**: Streamlined top-bar input strip for fast single-check entry in standard mode

### Bug Fixes
- Reset layout no longer removes stub fields (now normalizes model on reset)
- Three-up mode auto-adjust removed dead code referencing non-existent property
- Topbar respects light mode theme (was hardcoded dark)
- Mode select buttons, recent activity hover, and informational labels all respect accent color theme
- Calendar icon visibility fixed in light mode

---

## v1.0.0-beta.1 - The GL Code & 3-Up Pro Release

This major release introduces GL Code accounting integration, full 3-Up layout support, and comprehensive improvements to ledger management, batch printing, and export functionality.

---

### GL Code System (NEW)
- **GL Code Assignment**: Assign General Ledger codes to transactions for accounting categorization
- **GL Code Descriptions**: Human-readable labels alongside codes
- **Filtering**: Filter history and exports by GL Code
- **Propagation**: GL Codes automatically flow through check, stubs, history, and exports
- **Export Integration**: CSV and PDF exports include GL Code data
- **Sort Options**: Sort exports by GL Code for accounting workflows

### 3-Up Layout Mode (MAJOR)
- **3 Checks Per Page**: High-volume printing with independent slot management
- **Auto-Increment**: Check numbers automatically increment across all 3 slots
- **Combined Toggle**: Show Check Number & Auto-increment unified for 3-Up mode
- **Cut Lines**: Admin-controlled visual cut lines for print guidance
- **Import Queue Integration**: Select up to 3 queue items for batch filling
- **Address & GL Fields**: Full field support in all slots
- **Batch Printing**: Progressive ledger deductions with accurate balance snapshots

### Ledger Management Improvements
- **Hybrid Balance Calculation**: Accurate balance tracking (startingBalance + deposits - checks)
- **Manual Adjustments**: Add deposits or adjustments with reason/notes for audit trail
- **Total Balance View**: Top bar displays combined balance across all ledgers
- **Dual History Views**:
  - "All History" button shows transactions from all ledgers
  - "Ledger History" in sidebar filters to current ledger only
- **Recent Activity**: Sidebar shows last 2 transactions from current ledger
- **Income/Deposit Display**: Deposits show with green text and plus sign
- **Improved Dropdown Styling**: Better visual hierarchy in ledger selector

### Batch Printing Enhancements
- **Ledger Association**: Batch jobs now correctly respect ledger assignments per entry
- **Balance Snapshots**: Accurate starting balances using hybrid calculation
- **Progressive Deductions**: Each check properly deducts from running balance
- **Queue Item Removal**: Print & Record automatically removes item from queue
- **Type Tracking**: All batch entries properly tagged for balance calculation

### Import Queue Improvements
- **Delete Button**: Remove individual entries with trash icon
- **Toggle Selection**: Single-click to select/deselect entries (no more checkmarks)
- **Ledger Column**: Import files can specify ledger per transaction
- **Auto-Ledger Creation**: New ledgers created automatically if needed

### Export Enhancements
- **Check Number Column**: Exports now include check numbers
- **Time Recorded**: Precise timestamps for sorting accuracy
- **GL Code Columns**: GL Code and description in export data
- **Sort Options**: Sort by date, amount, payee, or GL Code
- **Filter by GL Code**: Export only transactions with specific GL Codes
- **PDF Export**: Generate PDF reports with full GL Code data
- **Improved Dropdown UI**: Better styling for filter/sort controls

### Check History Modal
- **Dual View Support**: Shows all ledgers or current ledger based on entry point
- **Delete Confirmation**: Proper z-index so confirmation appears above history modal
- **Income Display**: Deposits show green with plus sign, checks show red with minus
- **Address Fields**: Full address display in history detail view
- **GL Code Display**: Shows GL Code and description in detail view

### Field Editor Improvements
- **Quick Delete**: Toggle fields off directly from the canvas
- **Expandable Fields**: Text fields expand to prevent content cutoff
- **Template Opacity**: Default changed to 90% for better visibility
- **Duplicate GL Code Fix**: Removed duplicate GL Code field on Stub 2
- **Section Ordering**: Refined stub section ordering and display

### Date & Time Fixes
- **Timezone Handling**: Fixed deep issue with date initiating in wrong timezone
- **Precise Timestamps**: Better sorting with accurate time recording
- **Independent Date Toggles**: Show/hide date on check and each stub independently

### Stub System
- **Independent Date Display**: Each stub can show/hide date field separately
- **Address Fields**: Full address support on stubs
- **Date Syncing**: Stub dates automatically sync from check date

### UI/UX Improvements
- **Unified Print/Record Button**: Single button in top menu for Print & Record or Record Only
- **Reference Image Usability**: Improved template/reference image handling
- **Consistent Theming**: Field styling matches overall application theme
- **Improved Amount Filling**: Better handling of amount field input
- **Logo & Version Display**: Application logo and version visible in interface
- **Bug/Request Button**: Easy access to GitHub issue form

### Code Quality
- **Refactoring Phase 1 & 2**: Major code organization improvements
- **Custom Hooks**: Extracted usePersistenceSaver, useAutoIncrement, useKeyboardShortcuts
- **Improved Persistence**: Better state management and data saving logic

### Bug Fixes
- Display check number and date toggle now work correctly
- PDF save names properly sanitized
- Printer selection remembered for batch jobs
- Overlapping ledger names fixed
- GL Code and description properly persist from memory
- Address fields correctly filled in history modal
- Dropdown styling consistent throughout application
- Confirmation modals appear above other modals (z-index fix)

---

## v0.3.0 - The Ledger Pro Update

This release introduced significant improvements to data security, ledger management, and the layout editor.

### Security & Data Protection
- **Encrypted Backups**: Manual backups now require a user-generated password for encryption, ensuring data security for off-site storage.
- **Secure Restore**: Restoring from a backup requires the correct password to decrypt the data.

### Ledger Management
- **Multi-Ledger Imports**: Imported transactions are now automatically routed to their specific ledgers based on the "Ledger" column in the CSV file.
- **Auto-Creation**: New ledgers are automatically created if they don't exist during an import.
- **Global Permissions**: Replaced per-ledger permissions with a global "Allow standard users to manage ledgers" setting in Admin preferences.
- **UI Overhaul**:
  - Improved Ledger Selector dropdown.
  - Added dedicated Edit (pencil) and Delete (trash) icons.
  - Clicking the ledger balance now opens the history modal.
  - Improved currency formatting for initial balances.

### Layout Editor
- **Multi-Select**: You can now select multiple fields by holding `Ctrl` (or `Cmd`) / `Shift` and clicking.
- **Marquee Selection**: Click and drag on the background to draw a selection box and select multiple fields at once.
- **Group Dragging**: Moving one selected field moves all selected fields together, maintaining their relative positions.
- **Properties Panel**: Updated to handle multiple selections, showing a count of selected items and a "Clear Selection" button.

### General Improvements & Fixes
- **CSV Template**: Added a downloadable CSV template for easier data preparation.
- **Ledger History**: Enhanced history modal with better sorting and filtering.
- **Bug Fixes**:
  - Resolved duplicate icon declarations.
  - Fixed issue where ledger menu would close unexpectedly.
  - Prevented state overwrites during batch processing.
