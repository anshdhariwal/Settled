import { useState } from 'react'
import { IconTrash, IconCart, IconExchange, IconArrowRight, IconAlertTriangle, IconSuccessTick } from '../components/icons'
import { formatINR } from '../lib/formatINR'
import Modal from '../components/Modal'

export default function History({
  trips,
  items,
  shares,
  payments,
  generalTx,
  settlements = [],
  getMemberName,
  onViewTrip,
  onEditTrip,
  onDeleteTrip,
  onDeleteGeneral,
  onDeleteSettlement,
}) {
  const [expandedTripId, setExpandedTripId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  function confirmDelete() {
    if (!deleteConfirm) return
    if (deleteConfirm.type === 'trip') {
      onDeleteTrip(deleteConfirm.id)
    } else if (deleteConfirm.type === 'general') {
      onDeleteGeneral(deleteConfirm.id)
    } else if (deleteConfirm.type === 'settlement' && onDeleteSettlement) {
      onDeleteSettlement(deleteConfirm.id)
    }
    setDeleteConfirm(null)
  }

  return (
    <div className="space-y-4">
      <p className="sec-lbl">Activity History</p>

      {trips.length === 0 && generalTx.length === 0 && settlements.length === 0 && (
        <div className="settled-card p-8 text-center text-zinc-500 text-xs">
          No past transactions or settlements found.
        </div>
      )}

      {trips.map((trip) => {
        const tripItems = items.filter((it) => it.trip_id === trip.id)
        const tripPayments = payments.filter((p) => p.trip_id === trip.id)
        const itemTotal = tripItems.reduce((sum, it) => sum + Number(it.price), 0)
        const paymentTotal = tripPayments.reduce((sum, p) => sum + Number(p.amount), 0)
        const tripTotal = itemTotal > 0 ? itemTotal : paymentTotal
        const isExpanded = expandedTripId === trip.id

        const toggleLabel = isExpanded
          ? 'Hide Details'
          : tripItems.length > 0
          ? `View ${tripItems.length} Items`
          : tripPayments.length > 0
          ? `View ${tripPayments.length} Payments`
          : 'View Details'

        return (
          <div key={trip.id} className="settled-card p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                  <IconCart className="w-3 h-3 text-emerald-400" />
                  <span>Buy Trip</span>
                </span>
                <h4 className="font-bold text-sm text-white mt-1">{trip.place || 'Buy Trip'}</h4>
                <p className="text-[11px] text-zinc-500">{trip.date} · Created by {getMemberName(trip.created_by)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold font-mono text-amber-400 text-sm">₹{formatINR(tripTotal)}</p>
                <div className="flex gap-2 justify-end mt-1 items-center">
                  {onViewTrip && (
                    <button
                      onClick={() => onViewTrip(trip)}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
                    >
                      View Summary
                    </button>
                  )}
                  {onEditTrip && (
                    <button
                      onClick={() => onEditTrip(trip)}
                      className="text-xs text-zinc-400 hover:text-white underline"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                    className="text-xs text-zinc-400 hover:text-white underline"
                  >
                    {toggleLabel}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ type: 'trip', id: trip.id, name: trip.place || 'Buy Trip' })}
                    className="icon-btn icon-btn-danger text-zinc-400 p-1"
                    title="Delete Trip"
                  >
                    <div className="squish"></div>
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="pt-3 border-t border-zinc-800/80 space-y-2 text-xs">
                {tripItems.length > 0 ? (
                  <>
                    <p className="font-semibold text-zinc-400">Itemized Breakdown:</p>
                    <div className="space-y-1.5">
                      {tripItems.map((it) => {
                        const itemShares = shares.filter((s) => s.item_id === it.id)
                        return (
                          <div key={it.id} className="flex justify-between p-2 rounded bg-zinc-900/60 border border-zinc-800">
                            <div>
                              <p className="font-medium text-white">{it.name}</p>
                              <p className="text-[10px] text-zinc-350">Shared by: {itemShares.length > 0 ? itemShares.map((s) => getMemberName(s.person_id)).join(', ') : 'All Members'}</p>
                            </div>
                            <p className="font-mono text-zinc-300">₹{formatINR(it.price)}</p>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-zinc-400 italic">No line items recorded for this trip.</p>
                )}

                <p className="font-semibold text-zinc-400 pt-1">Payment Contributions:</p>
                <div className="flex flex-wrap gap-2">
                  {tripPayments.map((p) => (
                    <span key={p.person_id} className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-[11px] text-zinc-300">
                      {getMemberName(p.person_id)} paid <strong className="text-emerald-400">₹{formatINR(p.amount)}</strong>
                    </span>
                  ))}
                </div>

                {(() => {
                  const tripPreSets = settlements.filter((s) => s.trip_id === trip.id)
                  if (tripPreSets.length === 0) return null
                  return (
                    <>
                      <p className="font-semibold text-zinc-400 pt-1">Direct Pre-Transfers:</p>
                      <div className="flex flex-wrap gap-2">
                        {tripPreSets.map((st) => (
                          <span key={st.id} className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-[11px] text-zinc-300 flex items-center gap-1.5">
                            <span className="text-rose-400">{getMemberName(st.from_person)}</span>
                            <IconArrowRight className="w-3 h-3 text-zinc-500" />
                            <span className="text-emerald-400">{getMemberName(st.to_person)}</span>
                            <strong className="text-amber-400 font-mono ml-1">₹{formatINR(st.amount)}</strong>
                          </span>
                        ))}
                      </div>
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        )
      })}

      {generalTx.map((tx) => (
        <div key={tx.id} className="settled-card p-4 flex justify-between items-center">
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 font-medium">
              <IconExchange className="w-3 h-3 text-blue-400" />
              <span>General Tx</span>
            </span>
            <p className="font-semibold text-sm text-white mt-1">{tx.description || 'Direct Transfer'}</p>
            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
              <span className="text-rose-400 font-medium">{getMemberName(tx.from_person)}</span>
              <IconArrowRight className="w-3 h-3 text-zinc-500" />
              <span className="text-emerald-400 font-medium">{getMemberName(tx.to_person)}</span>
            </p>
          </div>
          <div className="text-right flex items-center gap-3">
            <p className="font-bold font-mono text-amber-400 text-sm">₹{formatINR(tx.amount)}</p>
            <button
              onClick={() => setDeleteConfirm({ type: 'general', id: tx.id, name: tx.description || 'General Transaction' })}
              className="icon-btn icon-btn-danger text-zinc-400 p-1"
              title="Delete Transaction"
            >
              <div className="squish"></div>
              <IconTrash className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}

      {settlements.filter((st) => !st.trip_id).map((st) => (
        <div key={st.id} className="settled-card p-4 flex justify-between items-center">
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
              <IconSuccessTick className="w-3 h-3 text-emerald-400" />
              <span>Settlement Payment</span>
            </span>
            <p className="text-xs font-semibold text-white mt-1">
              Direct Settlement
            </p>
            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
              <span className="text-rose-400 font-medium">{getMemberName(st.from_person)}</span>
              <IconArrowRight className="w-3 h-3 text-zinc-500" />
              <span className="text-emerald-400 font-medium">{getMemberName(st.to_person)}</span>
            </p>
          </div>
          <div className="text-right flex items-center gap-3">
            <p className="font-bold font-mono text-emerald-400 text-sm">₹{formatINR(st.amount)}</p>
            {onDeleteSettlement && (
              <button
                onClick={() => setDeleteConfirm({ type: 'settlement', id: st.id, name: `Settlement: ${getMemberName(st.from_person)} ➔ ${getMemberName(st.to_person)} (₹${formatINR(st.amount)})` })}
                className="icon-btn icon-btn-danger text-zinc-400 p-1"
                title="Delete Settlement"
              >
                <div className="squish"></div>
                <IconTrash className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}

      <Modal
        isOpen={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Record?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        danger={true}
      >
        <p className="text-xs text-zinc-300 leading-relaxed">
          Are you sure you want to delete <strong className="text-white">"{deleteConfirm?.name}"</strong>? This will permanently update all member balances.
        </p>
      </Modal>
    </div>
  )
}
