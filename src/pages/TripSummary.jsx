import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconChevronLeft,
  IconCopy,
  IconSuccessTick,
  IconChevronDown,
  IconChevronUp,
  IconArrowRight,
  IconUsers,
} from '../components/icons'
import { formatINR } from '../lib/formatINR'
import { calculateBalances } from '../lib/calculateBalances'

export default function TripSummary({ trip, items, shares, payments, members, clanId, onBack }) {
  const navigate = useNavigate()
  const [copiedSummary, setCopiedSummary] = useState(false)
  const [showPayers, setShowPayers] = useState(false)
  const [showItems, setShowItems] = useState(false)

  const tripItems = useMemo(() => (items || []).filter((it) => it.trip_id === trip.id), [items, trip.id])
  const tripPayments = useMemo(() => (payments || []).filter((p) => p.trip_id === trip.id), [payments, trip.id])
  const tripTotal = useMemo(() => tripItems.reduce((sum, it) => sum + Number(it.price), 0), [tripItems])

  function getMemberName(id) {
    const m = members.find((x) => x.id === id)
    if (m) return m.alias
    const creator = members.find((x) => x.is_creator)
    if (creator) return creator.alias
    return members[0]?.alias || 'Leader'
  }

  // Calculate isolated trip-scoped balances and settlements
  const calculation = useMemo(() => {
    if (!members.length || !trip) return { net_balances: [], settlements: [] }

    const tripsInput = [
      {
        items: tripItems.map((it) => ({
          price: Number(it.price),
          shared_by: (shares || []).filter((s) => s.item_id === it.id).map((s) => s.person_id),
        })),
        payments: tripPayments.map((p) => ({
          person: p.person_id,
          amount: Number(p.amount),
        })),
      },
    ]

    return calculateBalances({
      people: members.map((m) => m.id),
      trips: tripsInput,
      general_transactions: [],
      settlements: [],
    })
  }, [members, trip, tripItems, tripPayments, shares])

  // Group items by exact share set (e.g. "Ansh, Badal" or "All 5 Members")
  const groupedItems = useMemo(() => {
    const map = new Map()

    tripItems.forEach((it) => {
      const itemShares = (shares || []).filter((s) => s.item_id === it.id).map((s) => s.person_id).sort()
      const key = itemShares.join(',')

      if (!map.has(key)) {
        map.set(key, {
          shareIds: itemShares,
          items: [],
          subtotal: 0,
        })
      }

      const group = map.get(key)
      group.items.push(it)
      group.subtotal += Number(it.price)
    })

    return Array.from(map.values())
  }, [tripItems, shares])

  // Generate plain text summary for WhatsApp / clipboard sharing
  function handleCopyTextSummary() {
    if (!trip) return

    let summaryText = `*Trip Summary: ${trip.place || 'Buy Trip'}*\n`
    summaryText += `Date: ${trip.date}\n`
    summaryText += `Grand Total: ₹ ${formatINR(tripTotal)} (${tripItems.length} items)\n\n`

    const tripSettlements = calculation.settlements || calculation.settlementsSuggested || []

    if (tripSettlements.length > 0) {
      summaryText += `*Direct Settlements:*\n`
      tripSettlements.forEach((st) => {
        summaryText += `• ${getMemberName(st.from)} -> ${getMemberName(st.to)}: ₹ ${formatINR(st.amount)}\n`
      })
      summaryText += `\n`
    }

    summaryText += `*Reconciliation:*\n`
    calculation.net_balances.forEach((b) => {
      const sign = b.net > 0 ? '+' : ''
      summaryText += `• ${getMemberName(b.person)}: ${sign}₹ ${formatINR(b.net)} (Paid: ₹ ${formatINR(b.paid)}, Owed: ₹ ${formatINR(b.owed)})\n`
    })

    summaryText += `\n*Settled App*`

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(summaryText)
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = summaryText
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }

    setCopiedSummary(true)
    setTimeout(() => setCopiedSummary(false), 3000)
  }

  function handleBackClick() {
    if (onBack) {
      onBack()
    } else {
      navigate(`/clan/${clanId}`)
    }
  }

  return (
    <div className="settled-card p-5 sm:p-6 space-y-6">
      {/* Header — Clean, no AI capsules */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={handleBackClick} className="back-btn" title="Back to Clan">
            <IconChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold text-xl sm:text-2xl text-white tracking-tight">{trip.place || 'Buy Trip'}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Created by <span className="text-zinc-200 font-medium">{getMemberName(trip.created_by)}</span> · {trip.date}</p>
          </div>
        </div>

        <button
          onClick={handleCopyTextSummary}
          className="btn btn-s btn-sm shrink-0 w-auto text-xs flex items-center gap-1.5 px-3.5 py-1.5"
          title="Copy Text Summary for WhatsApp"
        >
          {copiedSummary ? <IconSuccessTick className="w-3.5 h-3.5 text-emerald-400" /> : <IconCopy className="w-3.5 h-3.5 text-blue-400" />}
          <span>{copiedSummary ? 'Copied!' : 'Share Text'}</span>
        </button>
      </div>

      {/* 1. Hero Section — Grand Total with Dotted Font on Number Only */}
      <div className="rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800/80 p-6 text-center space-y-2 relative overflow-hidden shadow-md">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-28 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />
        <p className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Grand Total Spent</p>
        <h3 className="font-bold text-amber-400 tracking-tight flex items-center justify-center gap-2 pt-1">
          <span className="text-amber-400/80 font-medium text-2xl sm:text-3xl">₹</span>
          <span className="hero-dotted text-4xl sm:text-6xl">{formatINR(tripTotal)}</span>
        </h3>
        <p className="text-xs text-zinc-400 pt-1 font-medium">{tripItems.length} item{tripItems.length !== 1 ? 's' : ''} in total</p>
      </div>

      {/* 2. Settlement Summary — Top Fold ("Who owes whom") */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="sec-lbl text-xs font-bold text-zinc-200">Direct Settlements (Who Owes Whom)</p>
          <span className="text-xs text-zinc-400 font-medium">Optimal Minimal</span>
        </div>

        {(() => {
          const settlementsList = (calculation.settlements || calculation.settlementsSuggested || []).sort((a, b) => b.amount - a.amount)
          if (settlementsList.length === 0) {
            return (
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center text-xs text-zinc-400">
                Everyone is fully settled for this trip!
              </div>
            )
          }
          return (
            <div className="space-y-2.5">
              {settlementsList.map((st, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between shadow-sm hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5 text-sm font-semibold text-white">
                    <span className="text-rose-400 font-medium">{getMemberName(st.from)}</span>
                    <IconArrowRight className="w-4 h-4 text-zinc-500" />
                    <span className="text-emerald-400 font-medium">{getMemberName(st.to)}</span>
                  </div>
                  <span className="font-bold font-mono text-emerald-400 text-base sm:text-lg flex items-center gap-1">
                    <span className="text-emerald-400/80 font-medium text-sm">₹</span>
                    <span>{formatINR(st.amount)}</span>
                  </span>
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      {/* 3. Per-Person Reconciliation Balance Table */}
      <div className="space-y-3">
        <p className="sec-lbl text-xs font-bold text-zinc-200">Per-Person Balance Reconciliation</p>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden text-xs sm:text-sm">
          <div className="grid grid-cols-12 gap-1.5 px-3.5 py-3 bg-zinc-900 border-b border-zinc-800 text-[11px] sm:text-xs font-bold text-zinc-300 uppercase tracking-wider">
            <span className="col-span-3">Member</span>
            <span className="col-span-3 text-right">Paid</span>
            <span className="col-span-3 text-right">Owes</span>
            <span className="col-span-3 text-right">Net</span>
          </div>

          <div className="divide-y divide-zinc-800/60">
            {calculation.net_balances.map((b) => {
              const isPositive = b.net > 0.005
              const isNegative = b.net < -0.005
              const absAmount = formatINR(Math.abs(b.net))

              return (
                <div key={b.person} className="grid grid-cols-12 gap-1.5 px-3.5 py-3.5 items-center">
                  <span className="col-span-3 font-semibold text-white truncate">
                    {getMemberName(b.person)}
                  </span>
                  <span className="col-span-3 text-right font-mono text-zinc-300 text-xs sm:text-sm whitespace-nowrap">
                    ₹ {formatINR(b.paid)}
                  </span>
                  <span className="col-span-3 text-right font-mono text-zinc-300 text-xs sm:text-sm whitespace-nowrap">
                    ₹ {formatINR(b.owed)}
                  </span>
                  <span className="col-span-3 text-right">
                    <span
                      className={`inline-flex items-center justify-end whitespace-nowrap text-nowrap px-2 py-1 rounded-md font-mono font-bold text-[11px] sm:text-xs ${
                        isPositive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                          : isNegative
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                          : 'text-zinc-400 bg-zinc-800/40 border border-zinc-700/40'
                      }`}
                    >
                      {isPositive ? `+₹ ${absAmount}` : isNegative ? `-₹ ${absAmount}` : 'settled'}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 4. Collapsible Payer Info (Accordion Slide Animation) */}
      <div className="border-t border-zinc-800/80 pt-3">
        <button
          onClick={() => setShowPayers(!showPayers)}
          className="w-full flex items-center justify-between text-xs font-bold text-zinc-300 hover:text-white py-2"
        >
          <span>Payer Contributions ({tripPayments.length})</span>
          {showPayers ? <IconChevronUp className="w-4 h-4 text-zinc-400" /> : <IconChevronDown className="w-4 h-4 text-zinc-400" />}
        </button>

        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showPayers ? 'max-h-[500px] opacity-100 pt-2' : 'max-h-0 opacity-0'}`}>
          <div className="flex flex-wrap gap-2.5">
            {tripPayments.map((p) => (
              <div key={p.person_id} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm flex items-center justify-between gap-3 flex-1 min-w-[150px]">
                <span className="font-semibold text-zinc-200">{getMemberName(p.person_id)}</span>
                <span className="font-mono font-bold text-emerald-400">₹ {formatINR(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Collapsible Grouped Item Breakdown (Accordion Slide Animation) */}
      <div className="border-t border-zinc-800/80 pt-3">
        <button
          onClick={() => setShowItems(!showItems)}
          className="w-full flex items-center justify-between text-xs font-bold text-zinc-300 hover:text-white py-2"
        >
          <span>Grouped Item Breakdown ({groupedItems.length} Groups)</span>
          {showItems ? <IconChevronUp className="w-4 h-4 text-zinc-400" /> : <IconChevronDown className="w-4 h-4 text-zinc-400" />}
        </button>

        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showItems ? 'max-h-[1200px] opacity-100 pt-3' : 'max-h-0 opacity-0'}`}>
          <div className="space-y-3">
            {groupedItems.map((grp, gIdx) => {
              const shareNames = grp.shareIds.map((id) => getMemberName(id))
              const isAll = grp.shareIds.length === members.length
              const perHead = grp.shareIds.length > 0 ? grp.subtotal / grp.shareIds.length : 0

              return (
                <div key={gIdx} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-2.5 text-xs sm:text-sm">
                  <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
                    <div className="flex items-center gap-1.5">
                      <IconUsers className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="font-bold text-white">
                        {isAll ? `All Members (${members.length})` : shareNames.join(', ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-amber-400 text-sm sm:text-base">₹ {formatINR(grp.subtotal)}</span>
                      <p className="text-[11px] text-zinc-400">₹ {formatINR(perHead)} / head</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    {grp.items.map((it) => (
                      <div key={it.id} className="flex justify-between items-center text-xs sm:text-sm text-zinc-200">
                        <span className="font-medium">{it.name}</span>
                        <span className="font-mono text-zinc-400">₹ {formatINR(it.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
