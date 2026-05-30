"use client"

import { useEffect, useState } from "react"
import {
  Calendar,
  Loader2,
  X,
  Save,
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

import { Button } from "@/components/ui/button"
import { EvidenciaUpload } from "@/components/evidencia-upload"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

interface Evidencia {
  id?: string
  actividadId?: string
  nombre: string
  descripcion?: string
  fecha?: string
  tipo: string
  url?: string
}

interface EditarEvidenciaModalProps {
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
}: EditarEvidenciaModalProps) {
  const [fecha, setFecha] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [evidenciasGuardadas, setEvidenciasGuardadas] = useState<any[]>([])

  useEffect(() => {
    if (evidencia && open) {
      setFecha(
        evidencia.fecha
          ? new Date(evidencia.fecha).toISOString().split("T")[0]
          : ""
      )

      setDescripcion(evidencia.descripcion || "")

      setEvidenciasGuardadas([
        {
          id: evidencia.id,
          nombre: evidencia.nombre,
          tipo: evidencia.tipo,
          url: evidencia.url
        }
      ])
    }
  }, [evidencia, open])

  const handleEvidenciaGuardada = (nuevaEvidencia: any) => {
    setEvidenciasGuardadas([nuevaEvidencia])
    toast.success("Nueva evidencia cargada")
  }

  const handleEliminarEvidencia = () => {
    setEvidenciasGuardadas([])
  }

  const handleGuardar = async () => {
    if (!evidencia?.id) return

    setSubmitting(true)

    try {
      await apiClient.updateEvidencia(
        evidencia.id,
        {
          fecha,
          descripcion,
          nombre: evidenciasGuardadas[0]?.nombre || evidencia.nombre,
          tipo: evidenciasGuardadas[0]?.tipo || evidencia.tipo,
          url: evidenciasGuardadas[0]?.url || evidencia.url
        },
        usuarioId
      )

      toast.success("Evidencia actualizada")

      onSuccess()
      onOpenChange(false)

    } catch (error) {
      console.error(error)
      toast.error("Error al actualizar evidencia")
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
              placeholder="Describe esta evidencia..."
            />
          </div>

          {/* Evidencia */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground">
              Reemplazar evidencia
            </label>

            <EvidenciaUpload
              actividadId={actividadId}
              onSuccess={handleEvidenciaGuardada}
            />

            {evidenciasGuardadas.length > 0 && (
              <div className="space-y-2">
                {evidenciasGuardadas.map((ev, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg"
                  >
                    {ev.tipo === "archivo" && (
                      <Upload className="h-4 w-4 text-primary" />
                    )}

                    {ev.tipo === "enlace" && (
                      <Link2 className="h-4 w-4 text-primary" />
                    )}

                    {ev.tipo === "nota" && (
                      <FileText className="h-4 w-4 text-primary" />
                    )}

                    <span className="flex-1 truncate text-sm">
                      {ev.nombre}
                    </span>

                    <button
                      type="button"
                      onClick={handleEliminarEvidencia}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleGuardar}
            disabled={submitting}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar cambios
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}