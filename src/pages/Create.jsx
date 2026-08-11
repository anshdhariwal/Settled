import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Shell, Field } from '../components/layout'
import { IconChevronLeft, IconChevronRight, IconCopy, IconSuccessTick, IconPlus, IconClose } from '../components/icons'
import { formatDOB, isValidDOB } from '../lib/formatINR'

const PENDING_KEY = 'settled_pending_created_clan'

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
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
  } catch (e) {
    // ignore
  }
}

function getStoredPendingState() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.joinCode && parsed.clanId) {
        return { step: 'success', result: parsed }
      }
    }
  } catch (e) {
    // fallback
  }
  return { step: 'form', result: null }
}

export default function Create({ onEnter }) {
  const navigate = useNavigate()
  const memberInputRef = useRef(null)
  const pending = getStoredPendingState()

  const [step, setStep] = useState(pending.step)
  const [result, setResult] = useState(pending.result)
  const [clanName, setClanName] = useState('')
  const [alias, setAlias] = useState('')
  const [dob, setDob] = useState('')
  const [shakeDob, setShakeDob] = useState(false)
  const [memberInput, setMemberInput] = useState('')
  const [memberList, setMemberList] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  function triggerDobShake() {
    setShakeDob(true)
    setTimeout(() => setShakeDob(false), 420)
  }

  function showToastError(msg) {
    setError(msg)
    setTimeout(() => setError(''), 3500)
  }

  function addMemberTag(name) {
    const clean = (name || '').trim().replace(/,/g, '')
    if (!clean) return
    if (memberList.includes(clean)) {
      showToastError(`${clean} is already in the list.`)
      return
    }
    setMemberList((prev) => [...prev, clean])
    setMemberInput('')
  }

  function removeMemberTag(index) {
    setMemberList(memberList.filter((_, i) => i !== index))
  }

  function handleAddAction(e) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    addMemberTag(memberInput)
    if (memberInputRef.current) {
      memberInputRef.current.focus()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddAction(e)
    }
  }

  async function handleCreateClan() {
    if (!clanName.trim() || !alias.trim()) {
      showToastError('Please fill in clan name and your name.')
      return
    }
    if (!isValidDOB(dob.trim())) {
      triggerDobShake()
      showToastError('Enter valid DOB (DD-MM-YYYY) between 01-01-1500 and 31-12-2500.')
      return
    }
    setError('')
    setLoading(true)
    const joinCode = generateJoinCode()
    const { data: clanData, error: clanError } = await supabase
      .from('clans')
      .insert({ name: clanName.trim(), join_code: joinCode, passcode: dob.trim() })
      .select()
      .single()

    if (clanError) {
      showToastError('Could not create clan. Try again.')
      setLoading(false)
      return
    }

    const { data: creatorMember, error: memberError } = await supabase
      .from('clan_members')
      .insert({ clan_id: clanData.id, alias: alias.trim(), is_creator: true })
      .select()
      .single()

    if (memberError) {
      showToastError('Could not create leader profile. Try again.')
      setLoading(false)
      return
    }

    if (memberList.length > 0) {
      await supabase
        .from('clan_members')
        .insert(memberList.map((name) => ({ clan_id: clanData.id, alias: name, is_creator: false })))
    }

    const createdObj = { clanId: clanData.id, memberId: creatorMember.id, joinCode }
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(createdObj))
    } catch (e) {
      // fallback
    }

    onEnter(clanData.id, creatorMember.id)
    setResult(createdObj)
    setStep('success')
    setLoading(false)
  }

  function handleCopyCode() {
    if (!result?.joinCode) return
    safeCopy(result.joinCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (step === 'success' && result) {
    return (
      <Shell>
        <div className="settled-card p-5 sm:p-6 space-y-5 text-center">
          <div className="space-y-1 pt-1">
            <h2 className="ph-title text-white">Clan Created!</h2>
            <p className="text-zinc-400 text-xs sm:text-sm">Share this Join Code with your members</p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-4 flex items-center justify-between gap-3">
            <div className="text-left">
              <p className="text-[10px] text-white uppercase tracking-wider font-mono">Join Code</p>
              <p className="text-xl font-bold tracking-[0.2em] text-blue-400 font-mono">{result.joinCode}</p>
            </div>
            <button onClick={handleCopyCode} className="btn btn-s btn-sm shrink-0 w-auto text-xs flex items-center gap-1.5 px-3.5">
              {copied ? <IconSuccessTick className="w-4 h-4 text-emerald-400" /> : <IconCopy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          <button
            className="btn btn-p"
            onClick={() => {
              sessionStorage.removeItem(PENDING_KEY)
              onEnter(result.clanId, result.memberId)
              navigate(`/clan/${result.clanId}`)
            }}
          >
            <span>Enter App</span>
            <IconChevronRight className="w-4 h-4 text-zinc-950" />
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="settled-card p-5 sm:p-6 space-y-5">
        <div className="ph">
          <button onClick={() => navigate('/')} className="back-btn" title="Back">
            <IconChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="ph-title">Create a Clan</h2>
        </div>

        <div className="space-y-4">
          <Field label="Clan Name">
            <input
              className="settled-input"
              value={clanName}
              onChange={(e) => setClanName(e.target.value)}
              placeholder="e.g. Flat 304 Ration Squad"
              autoFocus
            />
          </Field>
          <Field label="Leader Name (Your Alias)">
            <input
              className="settled-input"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="e.g. Ansh (Leader)"
            />
          </Field>
          <Field label="Leader Date of Birth (DOB)">
            <input
              className={`settled-input font-mono ${shakeDob ? 'field-shake' : ''}`}
              value={dob}
              onChange={(e) => setDob(formatDOB(e.target.value))}
              placeholder="DD-MM-YYYY (e.g. 15-08-2000)"
              maxLength={10}
              inputMode="numeric"
            />
          </Field>
          <Field label={`Pre-add Members (Optional) ${memberList.length > 0 ? `· ${memberList.length} Added` : ''}`}>
            <div className="space-y-2.5">
              <div className="flex gap-2">
                <input
                  ref={memberInputRef}
                  className="settled-input flex-1"
                  value={memberInput}
                  enterKeyHint="done"
                  onChange={(e) => setMemberInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type member name & press Enter"
                />
                <button
                  type="button"
                  onPointerDown={handleAddAction}
                  onTouchStart={handleAddAction}
                  onClick={handleAddAction}
                  className="btn btn-s btn-sm px-3.5 text-xs flex items-center gap-1 shrink-0"
                >
                  <IconPlus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {memberList.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  {memberList.map((m, idx) => (
                    <span
                      key={idx}
                      className="toast-msg inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700/80 text-xs text-zinc-200"
                    >
                      <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[10px] flex items-center justify-center">
                        {m.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-medium">{m}</span>
                      <button
                        type="button"
                        onClick={() => removeMemberTag(idx)}
                        className="text-zinc-400 hover:text-rose-400 ml-0.5 p-0.5 rounded transition-colors"
                        title="Remove member"
                      >
                        <IconClose className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Field>
        </div>

        {error && (
          <p className="toast-msg text-rose-400 text-xs font-medium bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
            {error}
          </p>
        )}

        <button disabled={loading} className="btn btn-p" onClick={handleCreateClan}>
          {loading ? 'Creating...' : 'Create Clan'}
        </button>
      </div>
    </Shell>
  )
}
