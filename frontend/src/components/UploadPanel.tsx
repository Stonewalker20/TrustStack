import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { PresetSourceItem } from '../types'

function apiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<{ detail?: string }>(error)) {
    return error.response?.data?.detail ?? fallback
  }
  return fallback
}

export function UploadPanel({ onUploaded }: { onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<string>('')
  const [presetSources, setPresetSources] = useState<PresetSourceItem[]>([])
  const [presetKey, setPresetKey] = useState<string>('')
  const [presetStatus, setPresetStatus] = useState<string>('')
  const isComplete = status.startsWith('Indexed ')
  const isPresetComplete = presetStatus.startsWith('Indexed ')

  useEffect(() => {
    let isMounted = true

    const loadPresets = async () => {
      try {
        const res = await api.get<PresetSourceItem[]>('/ingest/presets')
        if (!isMounted) return
        setPresetSources(res.data)
        if (res.data.length > 0) {
          setPresetKey((current) => current || res.data[0].key)
        }
      } catch (error) {
        console.error(error)
        if (isMounted) {
          setPresetStatus('Preset sources are unavailable right now.')
        }
      }
    }

    void loadPresets()

    return () => {
      isMounted = false
    }
  }, [])

  const handleUpload = async () => {
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    setStatus('Indexing document…')
    try {
      const res = await api.post('/ingest', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setStatus(`Indexed ${res.data.filename} with ${res.data.num_chunks} chunks`)
      setFile(null)
      onUploaded()
    } catch (error) {
      console.error(error)
      setStatus(apiErrorMessage(error, 'Upload failed'))
    }
  }

  const handlePresetLoad = async () => {
    if (!presetKey) return
    setPresetStatus('Indexing preset source…')
    try {
      const res = await api.post('/ingest/preset', { key: presetKey })
      setPresetStatus(`Indexed ${res.data.filename} with ${res.data.num_chunks} chunks`)
      onUploaded()
    } catch (error) {
      console.error(error)
      setPresetStatus(apiErrorMessage(error, 'Preset load failed'))
    }
  }

  return (
    <div className="panel panel--glass stack" data-testid="upload-panel">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Ingestion</div>
          <h2>Load source material</h2>
        </div>
      </div>
      <div className="helper-callout">
        <strong>Best first step</strong>
        <p>Upload one focused source document or a small set of related documents before asking any questions.</p>
      </div>
      <div className="preset-loader">
        <div className="preset-loader__copy">
          <strong>Or start with a preloaded source</strong>
          <p>Use a curated document set for a faster demo or a more controlled evaluation run.</p>
        </div>
        <div className="preset-loader__controls">
          <select
            className="input"
            value={presetKey}
            onChange={(e) => setPresetKey(e.target.value)}
            disabled={presetSources.length === 0}
          >
            {presetSources.length === 0 ? (
              <option value="">No preset sources available</option>
            ) : (
              presetSources.map((source) => (
                <option key={source.key} value={source.key}>
                  {source.label}
                </option>
              ))
            )}
          </select>
          <button className="secondary" onClick={handlePresetLoad} disabled={!presetKey}>
            Load preset source
          </button>
        </div>
        {presetKey ? (
          <div className="micro-status">
            <span className="micro-status__label">Preset source</span>
            <strong>{presetSources.find((source) => source.key === presetKey)?.filename ?? presetKey}</strong>
          </div>
        ) : null}
        <div className={`muted ${isPresetComplete ? 'muted--success' : ''}`}>
          {presetStatus ||
            (presetSources.find((source) => source.key === presetKey)?.description ??
              'Preset sources let the user begin with controlled evidence before uploading their own files.')}
        </div>
      </div>
      <label className="upload-dropzone">
        <input
          className="upload-input"
          data-testid="upload-input"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <span>{file ? file.name : 'Drop a PDF, TXT, DOCX, or MD file here.'}</span>
        <small>Accepted formats: PDF, TXT, DOCX, and Markdown. TrustStack will index the file into the evidence store.</small>
      </label>
      {file ? (
        <div className="micro-status">
          <span className="micro-status__label">Selected file</span>
          <strong>{file.name}</strong>
        </div>
      ) : null}
      <button className="primary" data-testid="upload-submit" onClick={handleUpload} disabled={!file}>
        Upload & Index
      </button>
      <div className={`muted ${isComplete ? 'muted--success' : ''}`} data-testid="upload-status">
        {status || 'Use short, clean domain documents with clear factual support for the strongest results.'}
      </div>
    </div>
  )
}
