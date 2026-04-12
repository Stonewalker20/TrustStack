import { useState } from 'react'
import { api } from '../lib/api'

export function UploadPanel({ onUploaded }: { onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<string>('')

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
      setStatus('Upload failed')
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
      <label className="upload-dropzone">
        <input
          className="upload-input"
          data-testid="upload-input"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <span>{file ? file.name : 'Drop a PDF, TXT, DOCX, or MD file here.'}</span>
        <small>TrustStack ingests the file into the evidence store for retrieval.</small>
      </label>
      <button className="primary" data-testid="upload-submit" onClick={handleUpload} disabled={!file}>
        Upload & Index
      </button>
      <div className="muted" data-testid="upload-status">
        {status || 'Use short, clean domain documents for the strongest demo.'}
      </div>
    </div>
  )
}
