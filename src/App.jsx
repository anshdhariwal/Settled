import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Create from './pages/Create'
import Join from './pages/Join'
import Clan from './pages/Clan'

const CLAN_ID_KEY = 'settled_clan_id'
const MEMBER_ID_KEY = 'settled_member_id'

export default function App() {
  const [clanId, setClanId] = useState(localStorage.getItem(CLAN_ID_KEY) || '')
  const [memberId, setMemberId] = useState(localStorage.getItem(MEMBER_ID_KEY) || '')

  useEffect(() => {
    const startTime = Date.now()
    const fontPromise = 'fonts' in document ? document.fonts.ready : Promise.resolve()

    fontPromise.then(() => {
      const elapsed = Date.now() - startTime
      const remainingTime = Math.max(1000 - elapsed, 0)

      setTimeout(() => {
        const loaderEl = document.getElementById('initial-loader')
        if (loaderEl) loaderEl.classList.add('fade-out')
      }, remainingTime)
    })
  }, [])

  function enterClan(newClanId, newMemberId) {
    localStorage.setItem(CLAN_ID_KEY, newClanId)
    localStorage.setItem(MEMBER_ID_KEY, newMemberId)
    setClanId(newClanId)
    setMemberId(newMemberId)
  }

  function exitClan() {
    localStorage.removeItem(CLAN_ID_KEY)
    localStorage.removeItem(MEMBER_ID_KEY)
    setClanId('')
    setMemberId('')
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={clanId && memberId ? <Navigate to={`/clan/${clanId}`} replace /> : <Landing />} />
        <Route path="/create" element={<Create onEnter={enterClan} />} />
        <Route path="/join" element={<Join onEnter={enterClan} />} />

        <Route path="/clan/:clanId" element={<Clan memberId={memberId} onExit={exitClan} />} />
        <Route path="/clan/:clanId/settings" element={<Clan memberId={memberId} onExit={exitClan} viewOverride="settings" />} />
        <Route path="/clan/:clanId/add-trip" element={<Clan memberId={memberId} onExit={exitClan} viewOverride="addtrip" />} />
        <Route path="/clan/:clanId/add-general" element={<Clan memberId={memberId} onExit={exitClan} viewOverride="addgeneral" />} />
        <Route path="/clan/:clanId/trip/:tripId" element={<Clan memberId={memberId} onExit={exitClan} viewOverride="tripsummary" />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
