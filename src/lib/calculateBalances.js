// Pure function: JSON in, JSON out. No UI, no network. See implementation spec section 5.

export function calculateBalances(input) {
  const { people, trips = [], general_transactions = [], settlements = [] } = input
  const net = Object.fromEntries(people.map((p) => [p, 0]))
  const paidTotal = Object.fromEntries(people.map((p) => [p, 0]))
  const owedTotal = Object.fromEntries(people.map((p) => [p, 0]))

  for (const trip of trips) {
    if (trip.items && trip.items.length > 0) {
      for (const item of trip.items) {
        if (!item.shared_by || item.shared_by.length === 0) continue
        const share = item.price / item.shared_by.length
        for (const person of item.shared_by) {
          if (!(person in net)) continue
          net[person] -= share
          owedTotal[person] += share
        }
      }
    } else if (trip.payments && trip.payments.length > 0 && people.length > 0) {
      const totalPayments = trip.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
      const share = totalPayments / people.length
      for (const person of people) {
        if (!(person in net)) continue
        net[person] -= share
        owedTotal[person] += share
      }
    }

    for (const payment of trip.payments || []) {
      if (!(payment.person in net)) continue
      net[payment.person] += Number(payment.amount || 0)
      paidTotal[payment.person] += Number(payment.amount || 0)
    }
  }

  for (const tx of general_transactions) {
    if (tx.to in net) net[tx.to] += tx.amount
    if (tx.from in net) net[tx.from] -= tx.amount
  }

  for (const s of settlements) {
    // A settlement means `from` paid `to` in real life, cancelling part of what `from` owed `to`.
    if (s.to in net) net[s.to] -= s.amount
    if (s.from in net) net[s.from] += s.amount
  }

  const net_balances = people.map((p) => ({
    person: p,
    net: round2(net[p]),
    paid: round2(paidTotal[p]),
    owed: round2(owedTotal[p]),
  }))

  const settlementsSuggested = greedySettle(net_balances.map((b) => ({ person: b.person, net: b.net })))

  const explanation = net_balances.map((b) => {
    if (b.net > 0.005) return `${b.person} is owed ${b.net} overall.`
    if (b.net < -0.005) return `${b.person} owes ${Math.abs(b.net)} overall.`
    return `${b.person} is settled up.`
  })

  return { net_balances, settlements: settlementsSuggested, explanation }
}

function greedySettle(balances) {
  const creditors = balances.filter((b) => b.net > 0.005).map((b) => ({ ...b })).sort((a, b) => b.net - a.net)
  const debtors = balances.filter((b) => b.net < -0.005).map((b) => ({ ...b, net: -b.net })).sort((a, b) => b.net - a.net)
  const result = []
  let i = 0, j = 0
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].net, creditors[j].net)
    if (pay > 0.005) {
      result.push({ from: debtors[i].person, to: creditors[j].person, amount: round2(pay) })
    }
    debtors[i].net -= pay
    creditors[j].net -= pay
    if (debtors[i].net <= 0.005) i++
    if (creditors[j].net <= 0.005) j++
  }
  return result
}

function round2(n) {
  return Math.round(n * 100) / 100
}
