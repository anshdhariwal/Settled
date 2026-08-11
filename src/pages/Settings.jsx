import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Field } from '../components/layout'
import { IconChevronLeft, IconCopy, IconSuccessTick } from '../components/icons'

export default function Settings({ clan, currentMember, clanId, memberId, onExit }) {
  const navigate = useNavigate()
  const [clanName, setClanName] = useState(clan.name)
  const [alias, setAlias] = useState(currentMember?.alias || '')
  const [confirmDisband, setConfirmDisband] = useState('')
  const [showDisband, setShowDisband] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [copied, setCopied] = useState(false)

  async function saveClanName() {
    await supabase.from('clans').update({ name: clanName }).eq('id', clanId)
    setSavedMsg('Clan name updated!')
    setTimeout(() => setSavedMsg(''), 2000)
  }

  async function saveAlias() {
    await supabase.from('clan_members').update({ alias }).eq('id', memberId)
    setSavedMsg('Alias updated!')
    setTimeout(() => setSavedMsg(''), 2000)
  }

  function handleCopyCode() {
    if (!clan?.join_code) return
    navigator.clipboard.writeText(clan.join_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function leaveClan() {
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
          <div className="flex gap-2">
            <input className="settled-input flex-1" value={clanName} onChange={(e) => setClanName(e.target.value)} />
            <button className="btn btn-s btn-sm shrink-0 w-auto px-4" onClick={saveClanName}>Save</button>
          </div>
        </Field>

        <Field label="Your Name / Alias">
          <div className="flex gap-2">
            <input className="settled-input flex-1" value={alias} onChange={(e) => setAlias(e.target.value)} />
            <button className="btn btn-s btn-sm shrink-0 w-auto px-4" onClick={saveAlias}>Save</button>
          </div>
        </Field>

        <Field label="Shareable Join Code">
          <div className="flex gap-2 items-center">
            <div className="shrink-0 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/90 text-center font-mono font-bold tracking-[0.2em] text-amber-400 text-sm">
              {clan.join_code}
            </div>
            <button onClick={handleCopyCode} className="btn btn-s flex-1 flex items-center justify-center gap-1.5">
              {copied ? <IconSuccessTick className="w-4 h-4 text-emerald-400" /> : <IconCopy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        </Field>
      </div>

      <div className="pt-4 border-t border-zinc-800 space-y-3">
        <button className="btn btn-s" onClick={leaveClan}>
          Leave Clan
        </button>

        {currentMember?.is_creator && !showDisband && (
          <button className="btn btn-danger" onClick={() => setShowDisband(true)}>
            Disband Clan (Leader Only)
          </button>
        )}

        {currentMember?.is_creator && showDisband && (
          <div className="rounded-xl border border-rose-900/80 p-4 space-y-3 bg-rose-950/20">
            <p className="text-xs text-rose-300">Warning: This will permanently delete the clan and all expense data. Type <strong>DELETE</strong> to confirm.</p>
            <input className="settled-input" value={confirmDisband} onChange={(e) => setConfirmDisband(e.target.value)} placeholder="Type DELETE" />
            <div className="flex gap-2">
              <button className="btn btn-s flex-1" onClick={() => setShowDisband(false)}>Cancel</button>
              <button disabled={confirmDisband !== 'DELETE'} className="btn btn-danger flex-1 disabled:opacity-40" onClick={disbandClan}>
                Confirm Disband
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
