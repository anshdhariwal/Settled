import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Field } from '../components/layout'
import { IconChevronLeft, IconCopy, IconSuccessTick, IconLogOut, IconAlertTriangle } from '../components/icons'

export default function Settings({ clan, currentMember, clanId, memberId, onExit }) {
  const navigate = useNavigate()
  const [clanName, setClanName] = useState(clan.name)
  const [alias, setAlias] = useState(currentMember?.alias || '')
  const [confirmDisband, setConfirmDisband] = useState('')
  const [showDisband, setShowDisband] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [copied, setCopied] = useState(false)

  async function saveClanName() {
    if (!currentMember?.is_creator) return
    await supabase.from('clans').update({ name: clanName }).eq('id', clanId)
    setSavedMsg('Clan name updated!')
    setTimeout(() => setSavedMsg(''), 2000)
  }

  async function saveAlias() {
    await supabase.from('clan_members').update({ alias }).eq('id', memberId)
    setSavedMsg('Alias updated!')
    setTimeout(() => setSavedMsg(''), 2000)
  }

  function safeCopy(text) {
    if (!text) return
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text))
    } else {
      fallbackCopy(text)
    }
  }

  function fallbackCopy(text) {
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      textArea.style.top = '-9999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    } catch (e) { }
  }

  function handleCopyCode() {
    if (!clan?.join_code) return
    safeCopy(clan.join_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function leaveClan() {
    setShowLeaveModal(false)
    await supabase.from('clan_members').update({ deleted: true }).eq('id', memberId)
    onExit()
    navigate('/')
  }

  async function disbandClan() {
    if (confirmDisband !== 'DELETE') return
    await supabase.from('clans').delete().eq('id', clanId)
    onExit()
    navigate('/')
  }

  function handleLogout() {
    onExit()
    navigate('/')
  }

  return (
    <div className="settled-card p-6 space-y-6">
      <div className="ph">
        <button onClick={() => navigate(`/clan/${clanId}`)} className="back-btn" title="Back">
          <IconChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="ph-title">Clan Settings</h2>
      </div>

      {savedMsg && <p className="toast-msg text-emerald-400 text-xs font-medium bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">{savedMsg}</p>}

      <div className="space-y-4">
        <Field label="Clan Name">
          {currentMember?.is_creator ? (
            <form onSubmit={(e) => { e.preventDefault(); saveClanName(); }} className="flex gap-2">
              <input className="settled-input flex-1" value={clanName} maxLength={24} onChange={(e) => setClanName(e.target.value)} />
              <button type="submit" className="btn btn-s btn-sm shrink-0 w-auto px-4">Save</button>
            </form>
          ) : (
            <div className="space-y-1">
              <input className="settled-input flex-1 opacity-60 cursor-not-allowed bg-zinc-900/40" value={clan.name} disabled readOnly />
              <p className="text-[11px] text-zinc-500 font-mono">Only clan leader can update clan name.</p>
            </div>
          )}
        </Field>

        <Field label="Your Name / Alias">
          <form onSubmit={(e) => { e.preventDefault(); saveAlias(); }} className="flex gap-2">
            <input className="settled-input flex-1" value={alias} maxLength={12} onChange={(e) => setAlias(e.target.value)} />
            <button type="submit" className="btn btn-s btn-sm shrink-0 w-auto px-4">Save</button>
          </form>
        </Field>

        <Field label="Shareable Join Code">
          <div className="flex gap-2 items-center">
            <div className="shrink-0 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/90 text-center font-mono font-bold tracking-[0.2em] text-blue-400 text-sm">
              {clan.join_code}
            </div>
            <button onClick={handleCopyCode} className="btn btn-s flex-1 flex items-center justify-center gap-1.5">
              {copied ? <IconSuccessTick className="w-4 h-4 text-emerald-400" /> : <IconCopy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        </Field>
      </div>

      <div className="space-y-2 pt-2">
        <p className="sec-lbl">Session & Account</p>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1 text-left">
            <p className="font-semibold text-sm text-white">Log Out</p>
            <p className="text-xs text-zinc-400">Exits session from this device. Your clan remains safe.</p>
          </div>
          <button className="btn btn-s btn-sm shrink-0 w-auto px-4 flex items-center gap-1.5" onClick={handleLogout}>
            <IconLogOut className="w-3.5 h-3.5 text-zinc-300" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <p className="sec-lbl">Danger Zone</p>
        <div className="rounded-xl border border-[rgba(240,136,62,0.35)] bg-zinc-950/60 divide-y divide-zinc-800/80 overflow-hidden">
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1 text-left">
              <p className="font-semibold text-sm text-white">Leave Clan</p>
              <p className="text-xs text-zinc-400">Exit this clan and mark your profile inactive.</p>
            </div>
            <button className="btn btn-s btn-sm shrink-0 w-auto px-4 flex items-center gap-1.5" onClick={() => setShowLeaveModal(true)}>
              <IconLogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-rose-300">Leave Clan</span>
            </button>
          </div>

          {currentMember?.is_creator && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-semibold text-sm text-white">Disband Clan</p>
                  <p className="text-xs text-zinc-400">Permanently delete this clan and all expense records.</p>
                </div>
                {!showDisband && (
                  <button className="btn btn-danger btn-sm shrink-0 w-auto px-4 flex items-center gap-1.5" onClick={() => setShowDisband(true)}>
                    <IconAlertTriangle className="w-3.5 h-3.5" />
                    <span>Disband Clan</span>
                  </button>
                )}
              </div>

              {showDisband && (
                <div className="pt-3 border-t border-zinc-800/80 space-y-3">
                  <p className="text-xs text-zinc-300">Type <strong>DELETE</strong> to confirm permanent disbanding.</p>
                  <div className="flex gap-2">
                    <input className="settled-input flex-1" value={confirmDisband} maxLength={6} onChange={(e) => setConfirmDisband(e.target.value)} placeholder="Type DELETE" />
                    <button className="btn btn-s btn-sm px-4" onClick={() => setShowDisband(false)}>Cancel</button>
                    <button disabled={confirmDisband !== 'DELETE'} className="btn btn-danger btn-sm px-4 disabled:opacity-40" onClick={disbandClan}>
                      Confirm Disband
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showLeaveModal && (
        <div className="settled-modal-backdrop">
          <div className="settled-modal-card settled-card p-5 space-y-4 border border-zinc-700/60 text-left">
            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-white">Leave Clan?</h3>
              <p className="text-xs text-zinc-400">
                Are you sure you want to leave <strong className="text-white">{clan.name}</strong>? You can rejoin anytime using the join code <span className="font-mono text-blue-400">{clan.join_code}</span>.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button className="btn btn-s flex-1 text-xs" onClick={() => setShowLeaveModal(false)}>
                Cancel
              </button>
              <button className="btn btn-danger flex-1 text-xs font-semibold" onClick={leaveClan}>
                Leave Clan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
