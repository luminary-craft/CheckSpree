## Resolved

### Issue 1: Check Display Static [FIXED]
-   The check display does not move with the check section if its order placement is adjusted.
-   **Fix**: Updated check-face-container to use `getSectionY('check', model.layout)` for dynamic positioning based on section order.

### Issue 2: Edit Mode - styling buttons [FIXED]
-   The styling buttons in edit layout mode are hidden behind the field boxes, making it impossible to click on if multiple fields are selected/overlapping.
-   **Fix**: Increased z-index for selected fieldBox from 100 to 500, and added explicit z-index 1000 for formatting toolbar in selected fields.

### Issue 3: UI - Backup notification toast incorrect [FIXED]
-   When manually backing up, there will be a message saying that the backup failed or cancelled, but it does save. The save also correctly imports as well.
-   **Fix**: Updated backup result handling to properly distinguish between success, failure with error, and user cancellation. Cancelled backups now show info toast instead of error.

### Issue 4: Stub Fields - Not correctly Hydrating [FIXED]
-   The Stub fields are displaying correctly on the canvas, but on the fields, they aren't correctly filled with the info, and changing in the fields does nothing. This needs to be simplified: Amount should not be adjusted on stubs field in the sidebar. In the sidebar, Payee and Memo fields for both stubs should by properly hydrated with data if available and editable.
-   **Fix**: Updated stub sync effect to populate all fields (date, payee, amount, memo) for both stubs. Made Amount fields read-only in sidebar. Payee and Memo fields now properly hydrate from main check data and remain editable.

### Enhancement 1: Quick Check [IMPLEMENTED]
-   Can we have a Quick Check section on the UI? Essentially, have a sticky section dedicated to quickly filling out check data. This should be in a different place than the sidebar. Its so someone could come in and just start typing out the info right away and printing, so only the essential details are needed: Payee, date selection, amount, memo. Perhaps even include the Print & Record/Record only button in this special section as well. Try to re-use code if possible to ensure consistency across the app.
-   **Implementation**: Added Quick Check bar between topbar and main layout. Features: Payee, Date, Amount (with $ prefix), Memo fields in a horizontal layout. Includes Print & Record and Record Only buttons. Hidden in Edit Mode and 3-Up layout. Uses existing data state and handlers for consistency.

---

## Open Issues

(none currently)
