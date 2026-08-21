import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Create from './pages/Create'
import Join from './pages/Join'
import Clan from './pages/Clan'

const CLAN_ID_KEY = 'settled_clan_id'
const MEMBER_ID_KEY = 'settled_member_id'
const LAST_ACTIVE_KEY = 'settled_last_active_at'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function getInitialSession() {
  const cId = localStorage.getItem(CLAN_ID_KEY) || ''
  const mId = localStorage.getItem(MEMBER_ID_KEY) || ''
  const lastActiveStr = localStorage.getItem(LAST_ACTIVE_KEY)

  if (!cId || !mId) return { clanId: '', memberId: '' }

  if (lastActiveStr) {
    const lastActive = parseInt(lastActiveStr, 10)
    if (!isNaN(lastActive) && Date.now() - lastActive > SEVEN_DAYS_MS) {
      localStorage.removeItem(CLAN_ID_KEY)
      localStorage.removeItem(MEMBER_ID_KEY)
      localStorage.removeItem(LAST_ACTIVE_KEY)
      return { clanId: '', memberId: '' }
    }
  }

  localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString())
  return { clanId: cId, memberId: mId }
}

export default function App() {
  const [session, setSession] = useState(getInitialSession)
  const { clanId, memberId } = session

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

  useEffect(() => {
    if (!clanId || !memberId) return

    let lastSaved = 0
    const touchActivity = () => {
      const now = Date.now()
      if (now - lastSaved > 60000) {
        lastSaved = now
        localStorage.setItem(LAST_ACTIVE_KEY, now.toString())
      }
    }

    touchActivity()

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'pointerdown']
    events.forEach((evt) => window.addEventListener(evt, touchActivity, { passive: true }))

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, touchActivity))
    }
  }, [clanId, memberId])

  function enterClan(newClanId, newMemberId) {
    localStorage.setItem(CLAN_ID_KEY, newClanId)
    localStorage.setItem(MEMBER_ID_KEY, newMemberId)
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString())
    setSession({ clanId: newClanId, memberId: newMemberId })
  }

  function exitClan() {
    localStorage.removeItem(CLAN_ID_KEY)
    localStorage.removeItem(MEMBER_ID_KEY)
    localStorage.removeItem(LAST_ACTIVE_KEY)
    setSession({ clanId: '', memberId: '' })
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
