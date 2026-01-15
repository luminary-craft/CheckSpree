# CheckSpree v0.3.0 Release Notes

This release introduces significant improvements to data security, ledger management, and the layout editor.

## 🔒 Security & Data Protection
- **Encrypted Backups**: Manual backups now require a user-generated password for encryption, ensuring data security for off-site storage.
- **Secure Restore**: Restoring from a backup requires the correct password to decrypt the data.

## 📚 Ledger Management
- **Multi-Ledger Imports**: Imported transactions are now automatically routed to their specific ledgers based on the "Ledger" column in the CSV file.
- **Auto-Creation**: New ledgers are automatically created if they don't exist during an import.
- **Global Permissions**: Replaced per-ledger permissions with a global "Allow standard users to manage ledgers" setting in Admin preferences.
- **UI Overhaul**:
  - Improved Ledger Selector dropdown.
  - Added dedicated Edit (pencil) and Delete (trash) icons.
  - Clicking the ledger balance now opens the history modal.
  - Improved currency formatting for initial balances.

## 🎨 Layout Editor
- **Multi-Select**: You can now select multiple fields by holding `Ctrl` (or `Cmd`) / `Shift` and clicking.
- **Marquee Selection**: Click and drag on the background to draw a selection box and select multiple fields at once.
- **Group Dragging**: Moving one selected field moves all selected fields together, maintaining their relative positions.
- **Properties Panel**: Updated to handle multiple selections, showing a count of selected items and a "Clear Selection" button.

## 🛠️ General Improvements & Fixes
- **CSV Template**: Added a downloadable CSV template for easier data preparation.
- **Ledger History**: Enhanced history modal with better sorting and filtering.
- **Bug Fixes**:
  - Resolved duplicate icon declarations.
  - Fixed issue where ledger menu would close unexpectedly.
  - Prevented state overwrites during batch processing.
