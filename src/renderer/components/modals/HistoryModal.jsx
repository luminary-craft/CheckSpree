import React from 'react'
import { formatCurrency } from '../../utils/helpers'
import { formatDate } from '../../constants/defaults'
import { TrashIcon } from '../../constants/icons'

export function HistoryModal({
  historyViewMode, activeLedger, activeLedgerId,
  checkHistory, ledgers, profiles, glCodes,
  historySearchTerm, setHistorySearchTerm,
  historyGlCodeFilter, setHistoryGlCodeFilter,
  historySortOrder, setHistorySortOrder,
  selectedHistoryItem, setSelectedHistoryItem,
  deleteHistoryEntry, fillFromHistoryEntry,
  setShowHistory
}) {
  const onClose = () => { setShowHistory(false); setSelectedHistoryItem(null) }

  const filteredHistory = historyViewMode === 'all'
    ? checkHistory
    : checkHistory.filter(c => c.ledgerId === activeLedgerId)

  const filteredAndSorted = filteredHistory
    .filter(entry => {
      if (historyGlCodeFilter !== 'all' && entry.glCode !== historyGlCodeFilter) return false
      if (!historySearchTerm) return true
      const term = historySearchTerm.toLowerCase()
      return (
        (entry.payee && entry.payee.toLowerCase().includes(term)) ||
        (entry.memo && entry.memo.toLowerCase().includes(term)) ||
        (entry.amount && entry.amount.toString().includes(term)) ||
        (entry.checkNumber && entry.checkNumber.toString().includes(term)) ||
        (entry.glCode && entry.glCode.toLowerCase().includes(term)) ||
        (entry.glDescription && entry.glDescription.toLowerCase().includes(term))
      )
    })
    .sort((a, b) => {
      let result = 0
      switch (historySortOrder) {
        case 'date-asc':
          result = new Date(a.date) - new Date(b.date)
          if (result === 0) result = (a.timestamp || 0) - (b.timestamp || 0)
          break
        case 'date-desc':
          result = new Date(b.date) - new Date(a.date)
          if (result === 0) result = (b.timestamp || 0) - (a.timestamp || 0)
          break
        case 'amount-asc':
          result = parseFloat(a.amount) - parseFloat(b.amount)
          break
        case 'amount-desc':
          result = parseFloat(b.amount) - parseFloat(a.amount)
          break
        case 'payee-asc':
          result = (a.payee || '').localeCompare(b.payee || '')
          break
        default:
          result = (b.timestamp || 0) - (a.timestamp || 0)
      }
      return result
    })

  const uniqueGlCodes = [...new Set(filteredHistory.map(c => c.glCode).filter(Boolean))].sort()

  return (
    <div className="modal-overlay history-modal-overlay" onClick={onClose}>
      <div className="history-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="history-modal-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>
              {historyViewMode === 'all'
                ? `Full History - All Ledgers`
                : `Check History - ${activeLedger?.name}`
              }
            </h2>
            <button className="btn-icon" onClick={onClose}>×</button>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <input
                type="text"
                placeholder="Search payee, memo, amount..."
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                style={{ width: '100%' }}
                autoFocus
              />
            </div>
            <div className="field" style={{ width: '175px', marginBottom: 0 }}>
              <select
                value={historyGlCodeFilter}
                onChange={(e) => setHistoryGlCodeFilter(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--surface-elevated)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
                title="Filter by GL Code"
              >
                <option value="all">All GL Codes</option>
                {uniqueGlCodes.map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ width: '200px', marginBottom: 0 }}>
              <select
                value={historySortOrder}
                onChange={(e) => setHistorySortOrder(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--surface-elevated)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <option value="date-desc">Date (Newest First)</option>
                <option value="date-asc">Date (Oldest First)</option>
                <option value="amount-desc">Amount (High to Low)</option>
                <option value="amount-asc">Amount (Low to High)</option>
                <option value="payee-asc">Payee (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="history-empty-state">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <path d="M32 8L8 20V42C8 51.9 18.8 56 32 56C45.2 56 56 51.9 56 42V20L32 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
            </svg>
            <h3>No checks recorded yet</h3>
            <p>Checks you print and record will appear here</p>
          </div>
        ) : (
          <div className="history-modal-body">
            <div className="history-list-column">
              {filteredAndSorted.map(entry => {
                const ledger = ledgers.find(l => l.id === entry.ledgerId)
                const profile = profiles.find(p => p.id === entry.profileId)
                return (
                  <div
                    key={entry.id}
                    className={`history-card ${selectedHistoryItem?.id === entry.id ? 'selected' : ''}`}
                    onClick={() => setSelectedHistoryItem(entry)}
                  >
                    <div className="history-card-main">
                      <div className="history-card-payee">{entry.payee}</div>
                      {entry.type === 'note' ? (
                        <div className="history-card-amount" style={{ color: 'var(--accent-hover)', fontSize: '12px' }}>
                          Note
                        </div>
                      ) : (
                        <div className={`history-card-amount ${entry.type === 'deposit' ? 'income' : ''}`}>
                          {entry.type === 'deposit' ? '+' : '-'}{formatCurrency(Math.abs(parseFloat(entry.amount)))}
                        </div>
                      )}
                    </div>
                    <div className="history-card-meta">
                      <span>{formatDate(entry.date)}</span>
                      {entry.timestamp && (
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>
                          • {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {entry.glCode && <span className="history-card-memo" style={{ color: 'var(--accent-hover)' }}>• GL: {entry.glCode}{entry.glDescription ? ` - ${entry.glDescription}` : (() => {
                        const match = glCodes.find(g => g.code === entry.glCode)
                        return match && match.description ? ` - ${match.description}` : ''
                      })()}</span>}
                      {entry.memo && <span className="history-card-memo">• {entry.memo}</span>}
                      {entry.reason && <span className="history-card-memo" style={{ color: 'var(--secondary)' }}>• {entry.reason}</span>}
                    </div>
                    <div className="history-card-tags">
                      <span className="tag tag-ledger">{ledger?.name || entry.ledgerName || 'Unknown'}</span>
                      <span className="tag tag-profile">{profile?.name || 'Unknown'}</span>
                    </div>
                    <button
                      className="history-card-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteHistoryEntry(entry.id)
                        if (selectedHistoryItem?.id === entry.id) {
                          setSelectedHistoryItem(null)
                        }
                      }}
                      title="Delete and restore amount"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                )
              })}
            </div>

            {selectedHistoryItem ? (
              <div className="history-detail-column">
                <div className="history-detail-header">
                  <h3>Check Details</h3>
                  <button className="btn btn-sm" onClick={() => setSelectedHistoryItem(null)} style={{ minWidth: 'fit-content', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
                    Close Preview
                  </button>
                </div>

                <div className="check-detail-grid">
                  <div className="detail-card">
                    <label>Date</label>
                    <div className="detail-value">{selectedHistoryItem.date}</div>
                  </div>

                  <div className="detail-card">
                    <label>Payee</label>
                    <div className="detail-value">{selectedHistoryItem.payee}</div>
                  </div>

                  {selectedHistoryItem.address && (
                    <div className="detail-card full-width">
                      <label>Address</label>
                      <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{selectedHistoryItem.address}</div>
                    </div>
                  )}

                  <div className="detail-card">
                    <label>Amount</label>
                    <div className={`detail-value amount ${selectedHistoryItem.type === 'deposit' ? 'positive' : 'negative'}`}>{formatCurrency(selectedHistoryItem.amount)}</div>
                  </div>

                  {selectedHistoryItem.memo && (
                    <div className="detail-card full-width">
                      <label>Memo</label>
                      <div className="detail-value">{selectedHistoryItem.memo}</div>
                    </div>
                  )}

                  {selectedHistoryItem.reason && (
                    <div className="detail-card full-width">
                      <label>Reason / Notes</label>
                      <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{selectedHistoryItem.reason}</div>
                    </div>
                  )}

                  {selectedHistoryItem.external_memo && (
                    <div className="detail-card full-width">
                      <label>External Memo</label>
                      <div className="detail-value">{selectedHistoryItem.external_memo}</div>
                    </div>
                  )}

                  {selectedHistoryItem.internal_memo && (
                    <div className="detail-card full-width">
                      <label>Internal Memo</label>
                      <div className="detail-value">{selectedHistoryItem.internal_memo}</div>
                    </div>
                  )}

                  {selectedHistoryItem.glCode && (
                    <div className="detail-card full-width">
                      <label>GL Code</label>
                      <div className="detail-value">
                        {selectedHistoryItem.glCode}
                        {selectedHistoryItem.glDescription ? ` - ${selectedHistoryItem.glDescription}` : (() => {
                          const match = glCodes.find(g => g.code === selectedHistoryItem.glCode)
                          return match && match.description ? ` - ${match.description}` : ''
                        })()}
                      </div>
                    </div>
                  )}

                  {selectedHistoryItem.line_items && selectedHistoryItem.line_items.length > 0 && (
                    <div className="detail-card full-width">
                      <label>Line Items</label>
                      <div className="line-items-table">
                        {selectedHistoryItem.line_items.map((item, idx) => (
                          <div key={idx} className="line-item-row">
                            <span>{item.description}</span>
                            <span>{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedHistoryItem.ledger_snapshot && (
                    <div className="detail-card full-width ledger-snapshot-card">
                      <label>Ledger Snapshot</label>
                      <div className="snapshot-grid">
                        <div className="snapshot-item">
                          <span className="snapshot-label">Previous Balance</span>
                          <span className="snapshot-value">
                            {formatCurrency(selectedHistoryItem.ledger_snapshot.previous_balance)}
                          </span>
                        </div>
                        <div className="snapshot-item">
                          <span className="snapshot-label">{selectedHistoryItem.type === 'note' ? 'Change' : 'Transaction'}</span>
                          <span className={`snapshot-value ${
                            selectedHistoryItem.type === 'note'
                              ? (parseFloat(selectedHistoryItem.ledger_snapshot.transaction_amount) >= 0 ? 'positive' : 'negative')
                              : (selectedHistoryItem.type === 'deposit' ? 'positive' : 'negative')
                          }`}>
                            {selectedHistoryItem.type === 'note'
                              ? (parseFloat(selectedHistoryItem.ledger_snapshot.transaction_amount) >= 0 ? '+' : '') + formatCurrency(selectedHistoryItem.ledger_snapshot.transaction_amount)
                              : (selectedHistoryItem.type === 'deposit' ? '+' : '-') + formatCurrency(Math.abs(parseFloat(selectedHistoryItem.ledger_snapshot.transaction_amount)))
                            }
                          </span>
                        </div>
                        <div className="snapshot-item balance-row">
                          <span className="snapshot-label">New Balance</span>
                          <span className={`snapshot-value ${selectedHistoryItem.ledger_snapshot.new_balance < 0 ? 'negative' : ''}`}>
                            {formatCurrency(selectedHistoryItem.ledger_snapshot.new_balance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="detail-card full-width timestamp-card">
                    <label>Recorded</label>
                    <div className="detail-value">{new Date(selectedHistoryItem.timestamp).toLocaleString()}</div>
                  </div>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <button
                    className="btn btn-sm danger"
                    onClick={() => {
                      deleteHistoryEntry(selectedHistoryItem.id)
                      setSelectedHistoryItem(null)
                    }}
                    style={{ width: '100%' }}
                  >
                    <TrashIcon /> Delete & Restore to Ledger
                  </button>
                </div>
              </div>
            ) : (
              <div className="history-detail-column history-detail-empty">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <rect x="20" y="16" width="40" height="48" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                  <path d="M28 28H52M28 36H52M28 44H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
                </svg>
                <h3>Select a check</h3>
                <p>Click on a check from the list to view its details</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
