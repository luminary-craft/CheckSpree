import { formatCurrency } from './helpers'

/**
 * Generate HTML Report for Check History
 */
export function generateReportHtml(checks, ledgerTotals, grandTotal, dateRangeStr) {
    const styles = `
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; color: #1e293b; }
      h1 { color: #0f172a; margin-bottom: 5px; }
      .meta { color: #64748b; font-size: 14px; margin-bottom: 30px; }
      .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
      .card { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
      .card-label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 5px; }
      .card-value { font-size: 24px; font-weight: 700; color: #0f172a; }
      .section-title { font-size: 18px; font-weight: 600; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 40px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600; }
      td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
      .amount { font-family: monospace; font-weight: 600; }
      .amount.negative { color: #ef4444; }
      .amount.positive { color: #10b981; }
      .ledger-group { margin-bottom: 30px; }
      .ledger-header { background: #f1f5f9; padding: 10px; font-weight: 600; border-radius: 4px; margin-bottom: 10px; display: flex; justify-content: space-between; }
      .tag { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 500; }
      .tag-profile { background: #e0f2fe; color: #0369a1; }
    `

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Check History Report</title>
        <style>${styles}</style>
      </head>
      <body>
        <h1>Check History Report</h1>
        <div class="meta">Generated on ${new Date().toLocaleString()} • Range: ${dateRangeStr}</div>

        <div class="summary-grid">
          <div class="card">
            <div class="card-label">Total Checks</div>
            <div class="card-value">${grandTotal.totalChecks}</div>
          </div>
          <div class="card">
            <div class="card-label">Total Spent</div>
            <div class="card-value">${formatCurrency(grandTotal.totalSpent)}</div>
          </div>
          <div class="card">
            <div class="card-label">Combined Balance</div>
            <div class="card-value">${formatCurrency(grandTotal.totalBalance)}</div>
          </div>
        </div>
    `

    // Group checks by ledger
    const checksByLedger = {}
    checks.forEach(check => {
        if (!checksByLedger[check.ledgerId]) checksByLedger[check.ledgerId] = []
        checksByLedger[check.ledgerId].push(check)
    })

    Object.entries(ledgerTotals).forEach(([ledgerId, total]) => {
        const ledgerChecks = checksByLedger[ledgerId] || []
        if (ledgerChecks.length === 0) return

        html += `
        <div class="ledger-group">
          <div class="ledger-header">
            <span>${total.name}</span>
            <span>Balance: ${formatCurrency(total.balance)}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 15%">Date</th>
                <th style="width: 30%">Payee</th>
                <th style="width: 15%">Amount</th>
                <th style="width: 20%">Memo</th>
                <th style="width: 10%">GL Code</th>
                <th style="width: 10%">Profile</th>
              </tr>
            </thead>
            <tbody>
      `

        ledgerChecks.forEach(check => {
            html += `
          <tr>
            <td>${check.date}</td>
            <td>${check.payee}</td>
            <td class="amount ${check.type === 'deposit' ? 'positive' : 'negative'}">
              ${check.type === 'deposit' ? '+' : ''}${formatCurrency(Math.abs(check.amount))}
            </td>
            <td>${check.memo || ''}</td>
            <td>${check.glCode || ''}</td>
            <td><span class="tag tag-profile">${check.profileName || 'Default'}</span></td>
          </tr>
        `
        })

        html += `
            </tbody>
          </table>
        </div>
      `
    })

    html += `
      </body>
      </html>
    `

    return html
}

/**
 * Generate CSV content from checks
 */
export function generateCSV(checks) {
    const headers = ['Date', 'Type', 'Payee', 'Amount', 'Memo', 'GL Code', 'Ledger', 'Check #']
    const rows = checks.map(check => [
        check.date,
        check.type || 'check',
        `"${(check.payee || '').replace(/"/g, '""')}"`,
        check.amount,
        `"${(check.memo || '').replace(/"/g, '""')}"`,
        check.glCode || '',
        check.ledgerName || '',
        check.checkNumber || ''
    ])

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
}

/**
 * Trigger file download
 */
export function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
