/**
 * LEGACY BATCH PRINT LOGIC
 * Extracted from App_MONOLITH.jsx during destructive audit.
 * This logic handles:
 * - Standard Batch Printing
 * - 3-Up Batch Printing
 * - Queue Management
 * - Dynamic Ledger Creation
 * - Error Handling & Recovery
 * 
 * TODO: Re-implement this using usePrinting hook and a new BatchPrintManager component.
 */

/*
const handleBatchPrintAndRecord = async () => {
  if (importQueue.length === 0) return

  // Show batch print confirmation modal
  setShowBatchPrintConfirm(true)
}

const confirmBatchPrint = async () => {
  // Validate printer mode settings
  if (preferences.batchPrintMode === 'silent' && !preferences.batchPrinterDeviceName) {
    alert('Please select a printer for silent printing mode')
    return
  }
  if (preferences.batchPrintMode === 'pdf' && !preferences.batchPdfExportPath) {
    alert('Please select a folder for PDF export')
    return
  }

  setShowBatchPrintConfirm(false)
  await executeBatchPrintAndRecord()
}

// Standard mode: One check at a time
const executeBatchPrintStandard = async () => {
  // Initialize batch print state
  setIsBatchPrinting(true)
  setBatchPrintCancelled(false)
  setBatchPrintProgress({ current: 0, total: importQueue.length })

  let processed = 0
  let failed = 0
  const newHistory = [...checkHistory]

  // Create a local copy of ledgers to track new ones created during this batch
  let tempLedgers = [...ledgers]
  const newLedgersToAdd = []

  // Track balances per ledger (ledgerId -> balance) using hybrid balance calculation
  const ledgerBalances = {}
  tempLedgers.forEach(l => {
    ledgerBalances[l.id] = calculateHybridBalance(l.id)
  })

  // Helper to find or create ledger LOCALLY within this batch
  const getLedgerId = (name) => {
    if (!name || !name.trim()) return activeLedgerId
    const trimmed = name.trim().toLowerCase()
    const existing = tempLedgers.find(l => l.name.toLowerCase() === trimmed)
    if (existing) return existing.id

    const newId = generateId()
    const newLedger = { id: newId, name: name.trim(), balance: 0 }
    tempLedgers.push(newLedger)
    newLedgersToAdd.push(newLedger)
    // Initialize balance for new ledger
    ledgerBalances[newId] = 0
    return newId
  }

  // Create a copy of the queue to iterate through
  const queueCopy = [...importQueue]

  // Apply check numbering if enabled
  let currentCheckNumber = batchAutoNumber ? parseInt(batchStartNumber) || 1001 : null

  for (let i = 0; i < queueCopy.length; i++) {
    // Check if user cancelled
    if (batchPrintCancelled) {
      break
    }

    const item = queueCopy[i]
    const amount = sanitizeCurrencyInput(item.amount)

    // Skip invalid items
    if (amount <= 0 || !item.payee?.trim()) {
      setBatchPrintProgress({ current: i + 1, total: queueCopy.length })
      continue
    }

    // Update progress
    setBatchPrintProgress({ current: i + 1, total: queueCopy.length })

    // Determine which ledger to use
    const targetLedgerId = getLedgerId(item.ledger)

    // Initialize balance if somehow missing
    if (ledgerBalances[targetLedgerId] === undefined) {
      ledgerBalances[targetLedgerId] = 0
    }

    // Normalize the date to YYYY-MM-DD format
    let normalizedDate = item.date || new Date().toISOString().slice(0, 10)
    if (item.date && !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
      // Date is not in YYYY-MM-DD format, try to parse it
      normalizedDate = convertExcelDate(item.date)
    }

    // Calculate ledger snapshot for display on check
    const previousBalanceForCheck = ledgerBalances[targetLedgerId]
    const newBalanceForCheck = previousBalanceForCheck - amount
    const ledgerSnapshotForDisplay = {
      previous_balance: previousBalanceForCheck,
      transaction_amount: amount,
      new_balance: newBalanceForCheck
    }

    // Load check data into the form for printing
    setData({
      date: normalizedDate,
      payee: item.payee,
      amount: item.amount,
      amountWords: numberToWords(item.amount),
      memo: item.memo || '',
      external_memo: item.external_memo || '',
      internal_memo: item.internal_memo || '',
      glCode: item.glCode || '',
      line_items: item.line_items || [],
      line_items_text: item.line_items_text || '',
      ledger_snapshot: ledgerSnapshotForDisplay,
      checkNumber: batchAutoNumber ? String(currentCheckNumber) : (item.checkNumber || '')
    })

    // Wait a brief moment for the UI to update with the new data
    await new Promise(resolve => setTimeout(resolve, 300))

    // Set document title for PDF filename
    const originalTitle = document.title
    const filename = generatePrintFilename(item, i + 1)
    document.title = filename

    // Trigger print based on mode
    setIsPrinting(true)
    let printSuccess = false
    let printError = null

    try {
      let res

      if (preferences.batchPrintMode === 'pdf') {
        // PDF Export Mode - auto-save to folder
        res = await window.cs2.savePdfToFile(preferences.batchPdfExportPath, filename)
      } else if (preferences.batchPrintMode === 'silent' && preferences.batchPrinterDeviceName) {
        // Silent Mode - print to saved printer
        res = await window.cs2.printSilent({ deviceName: preferences.batchPrinterDeviceName })
      } else {
        // Interactive Mode - show dialog (current behavior)
        res = await window.cs2.printDialog(filename)
      }

      // Restore original title
      document.title = originalTitle

      if (res?.success === false) {
        console.error(`Print failed for ${item.payee}: `, res.error)
        printError = res.error || 'Print was cancelled or failed'
      } else {
        printSuccess = true
      }
    } catch (error) {
      console.error(`Print error for ${item.payee}: `, error)
      printError = error.message || 'Unknown print error'
      // Restore original title on error
      document.title = originalTitle
    }
    setIsPrinting(false)

    // Handle print failure - pause and ask user
    if (!printSuccess) {
      const decision = await confirmPrintFailure(item.payee, printError)
      if (decision === 'abort') {
        // User chose to stop - mark as cancelled and break
        setBatchPrintCancelled(true)
        break
      }
      // User chose to continue - skip ledger update for this failed check
      failed++
      continue
    }

    // Wait for printer spooler to receive the job
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Record to ledger/history ONLY after confirmed success
    ledgerBalances[targetLedgerId] = newBalanceForCheck

    newHistory.unshift({
      id: generateId(),
      type: 'check',
      date: item.date || getLocalDateString(),
      payee: item.payee,
      amount: amount,
      memo: item.memo || '',
      external_memo: item.external_memo || '',
      internal_memo: item.internal_memo || '',
      glCode: item.glCode || '',
      line_items: item.line_items || [],
      line_items_text: item.line_items_text || '',
      ledgerId: targetLedgerId,
      profileId: activeProfileId,
      ledgerName: tempLedgers.find(l => l.id === targetLedgerId)?.name || '',
      profileName: profiles.find(p => p.id === activeProfileId)?.name || '',
      ledger_snapshot: {
        previous_balance: previousBalanceForCheck,
        transaction_amount: amount,
        new_balance: newBalanceForCheck
      },
      timestamp: Date.now(),
      balanceAfter: newBalanceForCheck,
      checkNumber: batchAutoNumber ? String(currentCheckNumber) : (item.checkNumber || '')
    })
    processed++

    // Increment check number if auto-numbering
    if (batchAutoNumber) {
      currentCheckNumber++
    }

  }

  // Atomic update for ledgers (add new ones + update balances)
  setLedgers(prev => {
    // 1. Start with existing ledgers + new ones
    let nextLedgers = [...prev, ...newLedgersToAdd]

    // 2. Update balances for all affected ledgers
    nextLedgers = nextLedgers.map(l => {
      if (ledgerBalances[l.id] !== undefined) {
        return { ...l, balance: ledgerBalances[l.id] }
      }
      return l
    })

    return nextLedgers
  })
  setCheckHistory(newHistory)

  // Update profile's next check number if auto-numbering was used
  if (batchAutoNumber && processed > 0) {
    setProfiles(prev => prev.map(p =>
      p.id === activeProfileId
        ? { ...p, nextCheckNumber: parseInt(batchStartNumber) + processed }
        : p
    ))
  }

  // Clear the queue and reset batch state
  setImportQueue([])
  setIsBatchPrinting(false)
  setBatchPrintProgress({ current: 0, total: 0 })

  // Clear the form fields
  setData({
    date: getLocalDateString(),
    payee: '',
    amount: '',
    amountWords: '',
    memo: '',
    external_memo: '',
    internal_memo: '',
    line_items: [],
    line_items_text: '',
    ledger_snapshot: null,
    checkNumber: ''
  })

  // Show completion modal
  setBatchCompleteData({ processed, total: queueCopy.length, cancelled: batchPrintCancelled, failed })
  setShowBatchCompleteModal(true)


  if (!batchPrintCancelled) {
    setShowImportQueue(false)
  }
}

// Three-up mode: Chunks of 3 checks per sheet
const executeBatchPrintThreeUp = async () => {
  // Initialize batch print state
  setIsBatchPrinting(true)
  setBatchPrintCancelled(false)
  setBatchPrintProgress({ current: 0, total: importQueue.length })

  let processed = 0
  let failed = 0
  const newHistory = [...checkHistory]

  // Create a local copy of ledgers to track new ones created during this batch
  let tempLedgers = [...ledgers]
  const newLedgersToAdd = []

  // Track balances per ledger (ledgerId -> balance) using hybrid balance calculation
  const ledgerBalances = {}
  tempLedgers.forEach(l => {
    ledgerBalances[l.id] = calculateHybridBalance(l.id)
  })

  // Helper to find or create ledger LOCALLY within this batch
  const getLedgerId = (name) => {
    if (!name || !name.trim()) return activeLedgerId
    const trimmed = name.trim().toLowerCase()
    const existing = tempLedgers.find(l => l.name.toLowerCase() === trimmed)
    if (existing) return existing.id

    const newId = generateId()
    const newLedger = { id: newId, name: name.trim(), balance: 0 }
    tempLedgers.push(newLedger)
    newLedgersToAdd.push(newLedger)
    // Initialize balance for new ledger
    ledgerBalances[newId] = 0
    return newId
  }

  // Create a copy of the queue to iterate through
  const queueCopy = [...importQueue]

  // Apply check numbering if enabled
  let currentCheckNumber = batchAutoNumber ? parseInt(batchStartNumber) || 1001 : null

  // Process in chunks of 3
  for (let chunkStart = 0; chunkStart < queueCopy.length; chunkStart += 3) {
    // Check if user cancelled
    if (batchPrintCancelled) {
      break
    }

    const chunk = queueCopy.slice(chunkStart, chunkStart + 3)
    const slotNames = ['top', 'middle', 'bottom']
    const newSheetData = {
      top: getEmptySlotData(),
      middle: getEmptySlotData(),
      bottom: getEmptySlotData()
    }

    // Load items into sheet slots
    const slotMetadata = []
    for (let i = 0; i < chunk.length; i++) {
      const item = chunk[i]
      const slot = slotNames[i]
      const amount = sanitizeCurrencyInput(item.amount)

      // Skip invalid items
      if (amount <= 0 || !item.payee?.trim()) {
        continue
      }

      // Determine which ledger to use
      const targetLedgerId = getLedgerId(item.ledger)

      // Initialize balance for newly created ledgers
      if (ledgerBalances[targetLedgerId] === undefined) {
        ledgerBalances[targetLedgerId] = 0
      }

      // Normalize the date
      let normalizedDate = item.date || getLocalDateString()
      if (item.date && !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
        normalizedDate = convertExcelDate(item.date)
      }

      // Calculate ledger snapshot BEFORE deducting (so check shows correct balance)
      const previousBalance = ledgerBalances[targetLedgerId]
      const ledgerSnapshotForDisplay = {
        previous_balance: previousBalance,
        transaction_amount: amount,
        new_balance: previousBalance - amount
      }

      // Populate slot data
      newSheetData[slot] = {
        date: normalizedDate,
        payee: item.payee,
        amount: item.amount,
        amountWords: numberToWords(item.amount),
        memo: item.memo || '',
        external_memo: item.external_memo || '',
        internal_memo: item.internal_memo || '',
        line_items: item.line_items || [],
        line_items_text: item.line_items_text || '',
        ledger_snapshot: ledgerSnapshotForDisplay,
        checkNumber: batchAutoNumber ? String(currentCheckNumber) : (item.checkNumber || '')
      }

      // Deduct from balance NOW so next check in this batch gets the updated balance
      ledgerBalances[targetLedgerId] -= amount

      // Store metadata for recording (with the already-calculated new balance)
      slotMetadata.push({
        slot,
        item,
        targetLedgerId,
        amount,
        previousBalance: previousBalance,
        newBalance: ledgerBalances[targetLedgerId],
        checkNumber: batchAutoNumber ? String(currentCheckNumber) : (item.checkNumber || '')
      })

      // Increment check number if auto-numbering
      if (batchAutoNumber) {
        currentCheckNumber++
      }
    }

    // Skip this chunk if no valid items
    if (slotMetadata.length === 0) {
      setBatchPrintProgress({ current: chunkStart + chunk.length, total: queueCopy.length })
      continue
    }

    // Load sheet data into state
    setSheetData(newSheetData)

    // Update progress
    setBatchPrintProgress({ current: chunkStart + chunk.length, total: queueCopy.length })

    // Wait for UI to update with the new data
    await new Promise(resolve => setTimeout(resolve, 300))

    // Set document title for PDF filename (use first slot's data)
    const originalTitle = document.title
    const sheetNumber = Math.floor(chunkStart / 3) + 1
    const filename = generatePrintFilename(slotMetadata[0].item, sheetNumber)
    document.title = filename

    // Trigger print ONCE for the entire sheet
    setIsPrinting(true)
    let printSuccess = false
    let printError = null

    try {
      let res

      if (preferences.batchPrintMode === 'pdf') {
        // PDF Export Mode - auto-save to folder
        res = await window.cs2.savePdfToFile(preferences.batchPdfExportPath, filename)
      } else if (preferences.batchPrintMode === 'silent' && preferences.batchPrinterDeviceName) {
        // Silent Mode - print to saved printer
        res = await window.cs2.printSilent({ deviceName: preferences.batchPrinterDeviceName })
      } else {
        // Interactive Mode - show dialog (current behavior)
        res = await window.cs2.printDialog(filename)
      }

      // Restore original title
      document.title = originalTitle

      if (res?.success === false) {
        console.error(`Print failed for sheet: `, res.error)
        printError = res.error || 'Print was cancelled or failed'
      } else {
        printSuccess = true
      }
    } catch (error) {
      console.error(`Print error for sheet: `, error)
      printError = error.message || 'Unknown print error'
      // Restore original title on error
      document.title = originalTitle
    }
    setIsPrinting(false)

    // Handle print failure - pause and ask user
    if (!printSuccess) {
      const decision = await confirmPrintFailure('Batch Sheet ' + sheetNumber, printError)
      if (decision === 'abort') {
        // User chose to stop - mark as cancelled and break
        setBatchPrintCancelled(true)
        break
      }
      // User chose to continue - skip ledger update for this failed sheet
      failed += slotMetadata.length
      continue
    }

    // Wait for printer spooler to receive the job
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Record ALL checks in this sheet to ledger/history
    slotMetadata.forEach(meta => {
      newHistory.unshift({
        id: generateId(),
        type: 'check',
        date: meta.item.date || getLocalDateString(),
        payee: meta.item.payee,
        amount: meta.amount,
        memo: meta.item.memo || '',
        external_memo: meta.item.external_memo || '',
        internal_memo: meta.item.internal_memo || '',
        glCode: meta.item.glCode || '',
        line_items: meta.item.line_items || [],
        line_items_text: meta.item.line_items_text || '',
        ledgerId: meta.targetLedgerId,
        profileId: activeProfileId,
        ledgerName: tempLedgers.find(l => l.id === meta.targetLedgerId)?.name || '',
        profileName: profiles.find(p => p.id === activeProfileId)?.name || '',
        ledger_snapshot: {
          previous_balance: meta.previousBalance,
          transaction_amount: meta.amount,
          new_balance: meta.newBalance
        },
        timestamp: Date.now(),
        balanceAfter: meta.newBalance,
        checkNumber: meta.checkNumber
      })
      processed++
    })

  }

  // Atomic update for ledgers (add new ones + update balances)
  setLedgers(prev => {
    // 1. Start with existing ledgers + new ones
    let nextLedgers = [...prev, ...newLedgersToAdd]

    // 2. Update balances for all affected ledgers
    nextLedgers = nextLedgers.map(l => {
      if (ledgerBalances[l.id] !== undefined) {
        return { ...l, balance: ledgerBalances[l.id] }
      }
      return l
    })

    return nextLedgers
  })
  setCheckHistory(newHistory)

  // Update profile's next check number if auto-numbering was used
  if (batchAutoNumber && processed > 0) {
    setProfiles(prev => prev.map(p =>
      p.id === activeProfileId
        ? { ...p, nextCheckNumber: parseInt(batchStartNumber) + processed }
        : p
    ))
  }

  // Clear the queue and reset batch state
  setImportQueue([])
  setIsBatchPrinting(false)
  setBatchPrintProgress({ current: 0, total: 0 })

  // Clear the form fields
  setSheetData({
    top: getEmptySlotData(),
    middle: getEmptySlotData(),
    bottom: getEmptySlotData()
  })

  // Show completion modal
  setBatchCompleteData({ processed, total: queueCopy.length, cancelled: batchPrintCancelled, failed })
  setShowBatchCompleteModal(true)

  if (!batchPrintCancelled) {
    setShowImportQueue(false)
  }
}
*/
