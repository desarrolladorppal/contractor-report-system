"use client"

import { useEffect, useState } from "react"
import {
  Calendar,
  Loader2,
  AlertCircle,
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

import { EvidenciaUpload } from "@/components/evidencia-upload"
import { Button } from "@/components/ui/button"
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

interface EditarEvidenciaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  evidencia: Evidencia | null
  actividadId: string
  onSuccess: () => void
}

export function EditarEvidenciaModal({
  open,
  onOpenChange,
  evidencia,
  actividadId,
  onSuccess
}: EditarEvidenciaModalProps) {
  const [fecha, setFecha] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [evidenciasGuardadas, setEvidenciasGuardadas] = useState<any[]>([])

  useEffect(() => {
    if (evidencia) {
      setFecha(evidencia.fecha?.split("T")[0] || "")
      setDescripcion(evidencia.descripcion || "")
      setEvidenciasGuardadas([evidencia])
    }
  }, [evidencia])

  const handleEvidenciaGuardada = (nuevaEvidencia: any) => {
    setEvidenciasGuardadas([nuevaEvidencia])
    toast.success("Evidencia actualizada")
  }

  const handleEliminarEvidencia = () => {
    setEvidenciasGuardadas([])
  }

  const handleGuardar = async () => {
    if (!evidencia?.id) return

    setSubmitting(true)

    try {
      // Aquí llamas tu API real
      /*
      await apiClient.updateEvidencia(evidencia.id, {
        fecha,
        descripcion,
        evidencia: evidenciasGuardadas[0]
      })
      */

      toast.success("Evidencia actualizada")
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error("Error al actualizar")
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
                    {ev.tipo === "archivo" && <Upload className="h-4 w-4" />}
                    {ev.tipo === "enlace" && <Link2 className="h-4 w-4" />}
                    {ev.tipo === "nota" && <FileText className="h-4 w-4" />}

                    <span className="flex-1 truncate text-sm">
                      {ev.nombre || "Evidencia"}
                    </span>

                    <button
                      onClick={handleEliminarEvidencia}
                      className="text-destructive"
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
