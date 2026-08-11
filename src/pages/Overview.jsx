import { IconSuccessTick, IconCart, IconExchange } from '../components/icons'

export default function Overview({ balances, getMemberName, onSettle, onGoAddTrip, onGoAddGeneral }) {
  return (
    <div className="space-y-5">
      <div className="settled-card p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Net Member Balances</h3>
          <span className="text-[11px] text-zinc-500 font-mono">Live calculation</span>
        </div>

        <div className="divide-y divide-zinc-800/80">
          {balances.net_balances.map((b) => (
            <div key={b.person} className="flex justify-between items-center py-3">
              <div>
                <p className="font-semibold text-sm text-white">{getMemberName(b.person)}</p>
                <p className="text-[11px] text-zinc-500">Paid: ₹{b.paid} · Owed: ₹{b.owed}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold font-mono ${
                b.net > 0.005 ? 'st-ok' : b.net < -0.005 ? 'st-err' : 'st-neu'
              }`}>
                {b.net > 0.005 ? `+₹${b.net}` : b.net < -0.005 ? `-₹${Math.abs(b.net)}` : 'settled'}
              </span>
            </div>
          ))}
          {balances.net_balances.length === 0 && (
            <div className="py-6 text-center text-zinc-500 text-xs">
              No expenses recorded yet. Click + to add your first trip!
            </div>
          )}
        </div>
      </div>

      {balances.settlements.length > 0 && (
        <div className="settled-card p-5 space-y-4 border-amber-500/20">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">Suggested Settlements</h3>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 font-mono">Greedy Optimal</span>
          </div>

          <div className="space-y-2.5">
            {balances.settlements.map((s, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <div className="text-xs text-zinc-200">
                  <span className="font-semibold text-rose-400">{getMemberName(s.from)}</span>
                  <span className="text-zinc-500 px-1">pays</span>
                  <span className="font-semibold text-emerald-400">{getMemberName(s.to)}</span>
                  <span className="font-bold text-amber-300 font-mono text-sm ml-2">₹{s.amount}</span>
                </div>
                <button
                  className="btn btn-s btn-sm text-xs flex items-center gap-1"
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

      <div className="grid grid-cols-2 gap-3 pt-2">
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
