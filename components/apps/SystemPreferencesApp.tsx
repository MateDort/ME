'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  PROVIDERS,
  saveApiKey,
  deleteApiKey,
  listStoredApiKeys,
  setSessionPassphrase,
  hasSessionPassphrase,
  clearSessionPassphrase,
  getApiKey,
  ProviderDefinition,
  ApiProvider,
} from '@/lib/api-config'

interface ProviderStatus {
  updatedAt?: number
  endpoint?: string
}

type Notice = { type: 'success' | 'error'; message: string } | null

export default function SystemPreferencesApp() {
  const [hasPassphrase, setHasPassphrase] = useState(hasSessionPassphrase())
  const [passphraseInput, setPassphraseInput] = useState('')
  const [providerInputs, setProviderInputs] = useState<Record<ApiProvider, string>>({
    claude: '',
    gemini: '',
    openai: '',
    custom: '',
  })
  const [endpointInputs, setEndpointInputs] = useState<Record<ApiProvider, string>>({
    claude: '',
    gemini: '',
    openai: '',
    custom: '',
  })
  const [statuses, setStatuses] = useState<Record<ApiProvider, ProviderStatus>>({
    claude: {},
    gemini: {},
    openai: {},
    custom: {},
  })
  const [notice, setNotice] = useState<Notice>(null)
  const [isBusy, setIsBusy] = useState(false)

  const formattedDate = (timestamp?: number) =>
    timestamp ? new Date(timestamp).toLocaleString() : 'Never'

  const refreshStatuses = () => {
    const stored = listStoredApiKeys()
    const next: Record<ApiProvider, ProviderStatus> = { claude: {}, gemini: {}, openai: {}, custom: {} }
    ;(Object.keys(next) as ApiProvider[]).forEach((key) => {
      if (stored[key]) {
        next[key] = {
          updatedAt: stored[key].updatedAt,
          endpoint: stored[key].endpoint,
        }
      }
    })
    setStatuses(next)
  }

  useEffect(() => {
    refreshStatuses()
  }, [])

  useEffect(() => {
    const handler = () => refreshStatuses()
    window.addEventListener('cursor-api-keys-updated', handler as EventListener)
    return () => {
      window.removeEventListener('cursor-api-keys-updated', handler as EventListener)
    }
  }, [])

  const handleSavePassphrase = () => {
    if (!passphraseInput.trim()) {
      setNotice({ type: 'error', message: 'Enter a passphrase (min 4 characters).' })
      return
    }
    setSessionPassphrase(passphraseInput.trim())
    setPassphraseInput('')
    setHasPassphrase(true)
    setNotice({ type: 'success', message: 'Session unlocked. Keys can now be encrypted.' })
  }

  const handleLockSession = () => {
    clearSessionPassphrase()
    setHasPassphrase(false)
    setNotice({ type: 'success', message: 'Session locked. Re-enter passphrase to edit keys.' })
  }

  const handleInputChange = (provider: ApiProvider, value: string) => {
    setProviderInputs((prev) => ({ ...prev, [provider]: value }))
  }

  const handleEndpointChange = (provider: ApiProvider, value: string) => {
    setEndpointInputs((prev) => ({ ...prev, [provider]: value }))
  }

  const handleSaveKey = async (provider: ApiProvider, definition: ProviderDefinition) => {
    if (!providerInputs[provider]) {
      setNotice({ type: 'error', message: `Enter a ${definition.name} API key before saving.` })
      return
    }
    setIsBusy(true)
    try {
      await saveApiKey(provider, providerInputs[provider].trim(), {
        endpoint: endpointInputs[provider]?.trim(),
      })
      setProviderInputs((prev) => ({ ...prev, [provider]: '' }))
      window.dispatchEvent(new CustomEvent('cursor-api-keys-updated'))
      refreshStatuses()
      setNotice({ type: 'success', message: `${definition.name} key encrypted and saved.` })
    } catch (error: any) {
      setNotice({
        type: 'error',
        message: error?.message || 'Failed to save key. Make sure the session passphrase is set.',
      })
    } finally {
      setIsBusy(false)
    }
  }

  const handleDeleteKey = async (provider: ApiProvider) => {
    await deleteApiKey(provider)
    window.dispatchEvent(new CustomEvent('cursor-api-keys-updated'))
    refreshStatuses()
    setNotice({ type: 'success', message: 'API key removed for this provider.' })
  }

  const handleTestKey = async (provider: ApiProvider, definition: ProviderDefinition) => {
    try {
      if (providerInputs[provider]) {
        if (providerInputs[provider].trim().length < 8) {
          setNotice({ type: 'error', message: 'Key looks too short.' })
          return
        }
        setNotice({ type: 'success', message: `${definition.name} key format looks valid.` })
        return
      }
      const record = await getApiKey(provider)
      if (record?.apiKey) {
        setNotice({ type: 'success', message: `${definition.name} key decrypted successfully.` })
      } else {
        setNotice({
          type: 'error',
          message: `No stored ${definition.name} key to test.`,
        })
      }
    } catch (error: any) {
      setNotice({
        type: 'error',
        message: error?.message || 'Unable to decrypt key. Unlock the session first.',
      })
    }
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{
        fontFamily: '"Lucida Grande", sans-serif',
        background: 'linear-gradient(180deg, #e9ecf7 0%, #cfd6ec 100%)',
      }}
    >
      <div
        className="px-5 py-3 border-b flex items-center justify-between"
        style={{
          borderColor: 'rgba(148,156,185,0.6)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(223,230,252,0.9) 100%)',
        }}
      >
        <div>
          <h2 className="text-lg font-bold text-[#2a3444]">System Preferences</h2>
          <p className="text-xs text-[#5c657a]">Manage encrypted API keys and session security.</p>
        </div>
        {notice && (
          <div
            className={`text-xs px-3 py-1.5 rounded-full ${
              notice.type === 'success' ? 'bg-[#d4f8d7] text-[#1b7a2d]' : 'bg-[#ffe1e1] text-[#8c1f1f]'
            }`}
          >
            {notice.message}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div
          className="rounded-2xl border border-[#c8d0eb] bg-white shadow-sm p-4 flex items-center justify-between gap-4"
          style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)' }}
        >
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-[#7b8195]">SESSION</p>
            <p className="text-sm text-[#2a3444]">
              {hasPassphrase
                ? 'Passphrase set for this session.'
                : 'Set a passphrase to encrypt API keys on this device.'}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="password"
                value={passphraseInput}
                onChange={(e) => setPassphraseInput(e.target.value)}
                placeholder={hasPassphrase ? 'Update passphrase...' : 'Create passphrase...'}
                className="px-3 py-2 rounded-lg border border-[#ccd3ec] text-sm w-64"
              />
              <button
                onClick={handleSavePassphrase}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                style={{
                  background: 'linear-gradient(180deg, #4e8dec 0%, #316fce 100%)',
                  boxShadow: '0 4px 12px rgba(49,111,206,0.4)',
                }}
              >
                {hasPassphrase ? 'Update' : 'Unlock'}
              </button>
              {hasPassphrase && (
                <button
                  onClick={handleLockSession}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#7b8195] border border-[#ccd3ec] bg-white"
                >
                  Lock
                </button>
              )}
            </div>
          </div>
        </div>

        {PROVIDERS.map((provider) => (
          <motion.div
            key={provider.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[#c8d0eb] bg-white p-4 space-y-3"
            style={{
              boxShadow: '0 8px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#2a3444] flex items-center gap-2">
                  {provider.name}
                  {statuses[provider.id]?.updatedAt && (
                    <span className="text-[10px] text-[#7b8195] font-normal">
                      Updated {formattedDate(statuses[provider.id]?.updatedAt)}
                    </span>
                  )}
                </p>
                <p className="text-xs text-[#5c657a]">{provider.description}</p>
              </div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-[#7b8195]">
                {statuses[provider.id]?.updatedAt ? 'Stored' : 'Missing'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-[#4a5866]">API Key</span>
                <input
                  type="password"
                  value={providerInputs[provider.id]}
                  onChange={(e) => handleInputChange(provider.id, e.target.value)}
                  placeholder={provider.placeholder}
                  className="px-3 py-2 rounded-lg border border-[#ccd3ec]"
                />
              </div>
              {provider.allowEndpoint && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-[#4a5866]">Endpoint</span>
                  <input
                    value={endpointInputs[provider.id]}
                    onChange={(e) => handleEndpointChange(provider.id, e.target.value)}
                    placeholder="https://example.com/v1"
                    className="px-3 py-2 rounded-lg border border-[#ccd3ec]"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => handleSaveKey(provider.id, provider)}
                disabled={isBusy || !hasPassphrase}
                className="px-4 py-2 rounded-lg text-white font-semibold disabled:opacity-40"
                style={{
                  background: 'linear-gradient(180deg, #4e8dec 0%, #316fce 100%)',
                  boxShadow: '0 4px 10px rgba(49,111,206,0.35)',
                }}
              >
                Save Key
              </button>
              <button
                onClick={() => handleTestKey(provider.id, provider)}
                className="px-4 py-2 rounded-lg border border-[#ccd3ec] text-[#4a5866] bg-white"
              >
                Test Connection
              </button>
              <button
                onClick={() => handleDeleteKey(provider.id)}
                className="px-4 py-2 rounded-lg border border-[#f3c1c1] text-[#8c1f1f] bg-[#fff4f4]"
              >
                Remove
              </button>
            </div>

            {provider.helper && (
              <p className="text-[11px] text-[#7b8195]">{provider.helper}</p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

