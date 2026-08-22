import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Shell, Field } from '../components/layout'
import { IconChevronLeft, IconChevronRight, IconCopy, IconSuccessTick, IconPlus, IconClose, IconEye, IconEyeOff, IconLock } from '../components/icons'
import { formatDOB, isValidDOB } from '../lib/formatINR'
import { copyToClipboard } from '../lib/copyToClipboard'

const PENDING_KEY = 'settled_pending_created_clan'

function generateJoinCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
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

const PASSCODE_MIN_WORDS = 6
const PASSCODE_MAX_WORDS = 10

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// strip control chars only; React escapes everything else at render time
function sanitizePasscode(text) {
  return text.replace(/[\x00-\x1F\x7F]/g, '')
}

export default function Create({ onEnter }) {
  const navigate = useNavigate()
  const memberInputRef = useRef(null)
  const pending = getStoredPendingState()

  const [step, setStep] = useState(pending.step === 'success' ? 'success' : 'passcode')
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

  // passcode step state
  const [passcode, setPasscode] = useState('')
  const [confirmPasscode, setConfirmPasscode] = useState('')
  const [showPasscode, setShowPasscode] = useState(false)
  const [showConfirmPasscode, setShowConfirmPasscode] = useState(false)

  function triggerDobShake() {
    setShakeDob(true)
    setTimeout(() => setShakeDob(false), 420)
  }

  function showToastError(msg) {
    setError(msg)
    setTimeout(() => setError(''), 3000)
  }

  function addMemberTag(name) {
    const clean = (name || '').trim().replace(/,/g, '')
    if (!clean) return
    if (alias.trim() && alias.trim().toLowerCase() === clean.toLowerCase()) {
      showToastError(`"${clean}" is already set as your Leader alias.`)
      return
    }
    if (memberList.some((m) => m.toLowerCase() === clean.toLowerCase())) {
      showToastError(`"${clean}" is already in the pre-added list.`)
      return
    }
    if (memberList.length >= 9) {
      showToastError('Maximum 10 members allowed per clan (including leader).')
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
    const words = countWords(passcode)
    if (words < PASSCODE_MIN_WORDS || words > PASSCODE_MAX_WORDS) {
      showToastError(`Passcode must be ${PASSCODE_MIN_WORDS} to ${PASSCODE_MAX_WORDS} words.`)
      return
    }
    if (passcode !== confirmPasscode) {
      showToastError('Passcodes do not match.')
      return
    }
    setError('')
    setLoading(true)
    const joinCode = generateJoinCode()
    const { data: clanData, error: clanError } = await supabase
      .from('clans')
      .insert({ name: clanName.trim(), join_code: joinCode, passcode: passcode.trim(), leader_dob: dob.trim() })
      .select('id, name, join_code, created_at')
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

  function handlePasscodeSubmit(e) {
    e.preventDefault()
    const words = countWords(passcode)
    if (words < PASSCODE_MIN_WORDS || words > PASSCODE_MAX_WORDS) {
      showToastError(`Passcode must be ${PASSCODE_MIN_WORDS} to ${PASSCODE_MAX_WORDS} words.`)
      return
    }
    if (passcode !== confirmPasscode) {
      showToastError('Passcodes do not match.')
      return
    }
    setStep('details')
  }

  function handleCopyCode() {
    if (!result?.joinCode) return
    copyToClipboard(result.joinCode)
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
              navigate('/clan')
            }}
          >
            <span>Enter App</span>
            <IconChevronRight className="w-4 h-4 text-zinc-950" />
          </button>
        </div>
      </Shell>
    )
  }

  if (step === 'passcode') {
    return (
      <Shell>
        <div className="settled-card p-5 sm:p-6 space-y-5">
          <div className="ph">
            <button onClick={() => setStep('form')} className="back-btn" title="Back">
              <IconChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="ph-title">Create a Clan</h2>
          </div>

          <form onSubmit={handlePasscodeSubmit} className="space-y-4">
            <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 text-xs text-zinc-400 space-y-1">
              <p className="flex items-center gap-2 font-semibold text-zinc-200">
                <IconLock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                Set a Clan Passcode
              </p>
              <p>Everyone who joins your clan will need this passcode along with the join code. Use {PASSCODE_MIN_WORDS} to {PASSCODE_MAX_WORDS} words.</p>
            </div>

            <Field label="Passcode">
              <div className="relative">
                <input
                  className="settled-input pr-11"
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => setPasscode(sanitizePasscode(e.target.value))}
                  placeholder={`e.g. purple tiger runs midnight river seven`}
                  autoComplete="new-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  title={showPasscode ? 'Hide passcode' : 'Show passcode'}
                >
                  {showPasscode ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1.5">{countWords(passcode)} / {PASSCODE_MIN_WORDS}-{PASSCODE_MAX_WORDS} words</p>
            </Field>

            <Field label="Confirm Passcode">
              <div className="relative">
                <input
                  className="settled-input pr-11"
                  type={showConfirmPasscode ? 'text' : 'password'}
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(sanitizePasscode(e.target.value))}
                  placeholder="Re-enter your passcode"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPasscode(!showConfirmPasscode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  title={showConfirmPasscode ? 'Hide passcode' : 'Show passcode'}
                >
                  {showConfirmPasscode ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                </button>
              </div>
            </Field>

            {error && (
              <p className="toast-msg text-rose-400 text-xs font-medium bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-p">
              <span>Continue</span>
              <IconChevronRight className="w-4 h-4 text-zinc-950" />
            </button>
          </form>
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

        <form onSubmit={(e) => { e.preventDefault(); if (memberInput.trim()) { addMemberTag(memberInput); setMemberInput(''); } else { handleCreateClan(); } }} className="space-y-4">
          <Field label="Clan Name">
            <input
              className="settled-input"
              value={clanName}
              maxLength={24}
              onChange={(e) => setClanName(e.target.value)}
              placeholder="e.g. Flat 304 Ration Squad"
              autoFocus
            />
          </Field>
          <Field label="Leader Name (Your Alias)">
            <input
              className="settled-input"
              value={alias}
              maxLength={12}
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
                  maxLength={12}
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
                      className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700/80 text-xs text-zinc-200"
                    >
                      <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[10px] flex items-center justify-center shrink-0">
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

          {error && (
            <p className="toast-msg text-rose-400 text-xs font-medium bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn btn-p">
            {loading ? 'Creating...' : 'Create Clan'}
          </button>
        </form>
      </div>
    </Shell>
  )
}
