"use client"

import { useEffect, useState } from "react"
import {
  Calendar,
  Loader2,
  Save,
  X,
  Upload,
  Link2,
  FileText
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"

import { EvidenciaUpload } from "@/components/evidencia-upload"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

interface Evidencia {
  id?: string
  nombre: string
  tipo: string
  fecha?: string
  descripcion?: string
  drive?: {
    url?: string
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  evidencia: Evidencia | null
  actividadId: string
  usuarioId: string
  onSuccess: () => void
}

export function EditarEvidenciaModal({
  open,
  onOpenChange,
  evidencia,
  actividadId,
  usuarioId,
  onSuccess
}: Props) {
  const [fecha, setFecha] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [nombre, setNombre] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [evidenciaActual, setEvidenciaActual] = useState<any>(null)

  useEffect(() => {
    if (open && evidencia) {
      console.log("📌 Evidencia recibida:", evidencia)

      setNombre(evidencia.nombre || "")
      setDescripcion(evidencia.descripcion || "")

      setFecha(
        evidencia.fecha
          ? new Date(evidencia.fecha).toISOString().split("T")[0]
          : ""
      )

      setEvidenciaActual(evidencia)
    }
  }, [open, evidencia])

  const handleNuevaEvidencia = (ev: any) => {
    setEvidenciaActual(ev)
    setNombre(ev.nombre || "")
    toast.success("Evidencia reemplazada")
  }

  const handleGuardar = async () => {
    if (!evidencia?.id) return

    try {
      setSubmitting(true)

      await apiClient.updateEvidencia(
        evidencia.id,
        {
          nombre,
          descripcion,
          fecha,
          tipo: evidenciaActual?.tipo || evidencia.tipo,
          drive: evidenciaActual?.drive || evidencia.drive
        },
        usuarioId
      )

      toast.success("Evidencia actualizada")
      onSuccess()
      onOpenChange(false)

    } catch (error) {
      console.error(error)
      toast.error("Error actualizando evidencia")
    } finally {
      setSubmitting(false)
    }
  }

  if (!evidencia) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar evidencia</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* Nombre */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg"
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Fecha
            </label>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-input rounded-lg"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Descripción
            </label>

            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg resize-none"
            />
          </div>

          {/* Evidencia actual */}
          {evidenciaActual && (
            <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg">
              {evidenciaActual.tipo === "archivo" && <Upload className="h-4 w-4" />}
              {evidenciaActual.tipo === "enlace" && <Link2 className="h-4 w-4" />}
              {evidenciaActual.tipo === "nota" && <FileText className="h-4 w-4" />}

              <span className="flex-1 truncate text-sm">
                {evidenciaActual.nombre}
              </span>

              <button
                onClick={() => setEvidenciaActual(null)}
                className="text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Reemplazar */}
          <EvidenciaUpload
            actividadId={actividadId}
            onSuccess={handleNuevaEvidencia}
          />

          <button
            onClick={handleGuardar}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar cambios
              </>
            )}
          </button>

        </div>
      </DialogContent>
    </Dialog>
  )
}