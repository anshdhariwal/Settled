import { IconSuccessTick, IconCart, IconExchange } from '../components/icons'

export default function Overview({ balances, getMemberName, onSettle, onGoAddTrip, onGoAddGeneral }) {
  return (
    <div className="space-y-4">
      <div className="settled-card overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex justify-between items-center">
          <p className="sec-lbl">Net Member Balances</p>
          <span className="text-[11px] text-zinc-500 font-mono">Live calculation</span>
        </div>

        <div className="p-2 space-y-1">
          {balances.net_balances.map((b) => {
            const name = getMemberName(b.person)
            const initial = name.charAt(0).toUpperCase()
            return (
              <div
                key={b.person}
                className="p-3 rounded-xl hover:bg-zinc-800/50 border border-transparent hover:border-zinc-700/40 transition-all duration-150 flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700/60 text-zinc-200 flex items-center justify-center font-semibold text-sm shrink-0 select-none group-hover:border-zinc-600 transition-colors">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-white truncate">{name}</p>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      Paid: <span className="text-zinc-300">₹{b.paid}</span> · Owed: <span className="text-zinc-300">₹{b.owed}</span>
                    </p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold font-mono shrink-0 transition-transform duration-150 group-hover:scale-[1.03] ${
                    b.net > 0.005 ? 'st-ok' : b.net < -0.005 ? 'st-err' : 'st-neu'
                  }`}
                >
                  {b.net > 0.005 ? `+₹${b.net}` : b.net < -0.005 ? `-₹${Math.abs(b.net)}` : 'settled'}
                </span>
              </div>
            )
          })}

          {balances.net_balances.length === 0 && (
            <div className="py-8 text-center text-zinc-500 text-xs">
              No expenses recorded yet. Click + to add your first trip!
            </div>
          )}
        </div>
      </div>

      {balances.settlements.length > 0 && (
        <div className="settled-card p-4 space-y-3 border-blue-500/20">
          <div className="flex justify-between items-center">
            <p className="sec-lbl">Suggested Settlements</p>
            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 font-mono">Greedy Optimal</span>
          </div>

          <div className="space-y-2">
            {balances.settlements.map((s, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all"
              >
                <div className="text-xs text-zinc-200 flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-rose-400">{getMemberName(s.from)}</span>
                  <span className="text-zinc-500 text-[11px]">pays</span>
                  <span className="font-semibold text-emerald-400">{getMemberName(s.to)}</span>
                  <span className="font-bold text-blue-400 font-mono text-sm ml-1">₹{s.amount}</span>
                </div>
                <button
                  className="btn btn-s btn-sm text-xs flex items-center gap-1 px-3 hover:border-emerald-500/40 hover:text-emerald-300 transition-all"
                  onClick={() => onSettle(s.from, s.to, s.amount)}
                >
                  <IconSuccessTick className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mark Paid</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 pt-1">
        <button className="btn btn-p" onClick={onGoAddTrip}>
          <IconCart className="w-4 h-4 text-zinc-950" />
          <span>Add Buy Trip</span>
        </button>
        <button className="btn btn-s" onClick={onGoAddGeneral}>
          <IconExchange className="w-4 h-4 text-zinc-300" />
          <span>Add General</span>
        </button>
      </div>
    </div>
  )
}
