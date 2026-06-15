"use client"

import { useState, useRef } from "react"
import { Upload, Link2, FileText, X, Loader2, FolderOpen, Download } from "lucide-react"
import { useContrato } from "@/contexts/contrato-context"
import { toast } from "sonner"

interface EvidenciaUploadProps {
  actividadId: string
  aporteId?: string
  onSuccess?: (evidencia: any) => void
}

type TipoEvidencia = 'archivo' | 'enlace' | 'nota'

interface EnlaceForm {
  url: string
  titulo: string
  descripcion: string
}

interface NotaForm {
  titulo: string
  contenido: string
}

export function EvidenciaUpload({ actividadId, aporteId, onSuccess }: EvidenciaUploadProps) {
  const { contratoActivo, usuarioId } = useContrato()
  const [tipo, setTipo] = useState<TipoEvidencia>('archivo')
  const [uploading, setUploading] = useState(false)
  const [enlaceForm, setEnlaceForm] = useState({ url: '', titulo: '', descripcion: '' })
  const [notaForm, setNotaForm] = useState({ titulo: '', contenido: '' })
  const [carpetaUrl, setCarpetaUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('archivo', file)
    formData.append('usuarioId', usuarioId!)
    formData.append('contratoId', contratoActivo!)
    formData.append('actividadId', actividadId)

    const evidencia = {tipo: 'archivo', nombre: file.name,archivo: file}
    onSuccess?.(evidencia)
    toast.success('Archivo agregado: ' + file.name)
    if(fileInputRef.current) {fileInputRef.current.value = ''}
  }

  const handleEnlaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enlaceForm.url) {
      toast.error('La URL es requerida')
      return
    }

    const evidencia = {tipo: 'enlace', url: enlaceForm.url, titulo: enlaceForm.titulo, descripcion: enlaceForm.descripcion}
    onSuccess?.(evidencia)
    setEnlaceForm({ url: '', titulo: '', descripcion: '' })
    toast.success('Enlace agregado')
  }

  const handleNotaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notaForm.contenido) {
      toast.error('El contenido es requerido')
      return
    }

    const evidencia = {tipo: 'nota', titulo: notaForm.titulo, contenido: notaForm.contenido}
    onSuccess?.(evidencia)
    setNotaForm({ titulo: '', contenido: '' })
    toast.success('Nota agregada')
  }

  const handleDownloadZip = async () => {
    try {
      toast.info("Preparando descarga de evidencias...")
      
      // ✅ CORREGIDO: Agregar /api/ a la ruta
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/evidencias/contrato/${contratoActivo}/zip?usuarioId=${usuarioId}`
      )
      
      if (!response.ok) throw new Error('Error al descargar evidencias')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `evidencias-contrato-${contratoActivo?.substring(0, 8)}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success("Descarga completada")
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al descargar evidencias')
    }
  }

  return (
    <div className="space-y-4">
      {/* Selector de tipo */}
      <div className="flex gap-2">
        <button
          onClick={() => setTipo('archivo')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            tipo === 'archivo'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <Upload className="h-4 w-4 inline mr-2" />
          Archivo
        </button>
        <button
          onClick={() => setTipo('enlace')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            tipo === 'enlace'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <Link2 className="h-4 w-4 inline mr-2" />
          Enlace
        </button>
        <button
          onClick={() => setTipo('nota')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            tipo === 'nota'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <FileText className="h-4 w-4 inline mr-2" />
          Nota
        </button>
      </div>

      {/* Contenido según tipo */}
      <div className="border border-border rounded-lg p-4">
        {tipo === 'archivo' && (
          <div className="text-center">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:bg-primary/90 transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Seleccionar archivo
                </>
              )}
            </label>
            <p className="text-xs text-muted-foreground mt-2">
              {carpetaUrl ? 'Se usará Google Drive' : 'Se guardará en el sistema'}
            </p>
          </div>
        )}

        {tipo === 'enlace' && (
          <form onSubmit={handleEnlaceSubmit} className="space-y-3">
            <input
              type="url"
              placeholder="URL del enlace *"
              value={enlaceForm.url}
              onChange={(e) => setEnlaceForm({ ...enlaceForm, url: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg text-sm"
              required
            />
            <input
              type="text"
              placeholder="Título (opcional)"
              value={enlaceForm.titulo}
              onChange={(e) => setEnlaceForm({ ...enlaceForm, titulo: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg text-sm"
            />
            <textarea
              placeholder="Descripción (opcional)"
              value={enlaceForm.descripcion}
              onChange={(e) => setEnlaceForm({ ...enlaceForm, descripcion: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-input rounded-lg text-sm resize-none"
            />
            <button
              type="submit"
              disabled={uploading}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploading ? 'Guardando...' : 'Guardar enlace'}
            </button>
          </form>
        )}

        {tipo === 'nota' && (
          <form onSubmit={handleNotaSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Título (opcional)"
              value={notaForm.titulo}
              onChange={(e) => setNotaForm({ ...notaForm, titulo: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg text-sm"
            />
            <textarea
              placeholder="Contenido de la nota *"
              value={notaForm.contenido}
              onChange={(e) => setNotaForm({ ...notaForm, contenido: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-input rounded-lg text-sm resize-none"
              required
            />
            <button
              type="submit"
              disabled={uploading}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploading ? 'Guardando...' : 'Guardar nota'}
            </button>
          </form>
        )}
      </div>

      {/* Acciones adicionales */}
      <div className="flex gap-2">
        {carpetaUrl && (
          <a
            href={carpetaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm"
          >
            <FolderOpen className="h-4 w-4" />
            Ver en Drive
          </a>
        )}
        
        <button
          onClick={handleDownloadZip}
          className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
        >
          <Download className="h-4 w-4" />
          Descargar ZIP
        </button>
      </div>
    </div>
  )
}