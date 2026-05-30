"use client"

import { useEffect, useState } from "react"
import { Calendar, Loader2, Save } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

interface Evidencia {
  id?: string
  nombre: string
  tipo: string
}

interface Aporte {
  id: string
  fecha?: string
  descripcion?: string
  estado?: string
  evidenciaIds?: string[]
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  aporte: Aporte | null
  evidencias: Evidencia[]
  usuarioId: string
  onSuccess: () => void
}

export function EditarAporteModal({
  open,
  onOpenChange,
  aporte,
  evidencias,
  usuarioId,
  onSuccess
}: Props) {
  const [fecha, setFecha] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [estado, setEstado] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (aporte && open) {
      setFecha(
        aporte.fecha
          ? new Date(aporte.fecha).toISOString().split("T")[0]
          : ""
      )

      setDescripcion(aporte.descripcion || "")
      setEstado(aporte.estado || "")
    }
  }, [aporte, open])

  const handleGuardar = async () => {
    if (!aporte?.id) return

    try {
      setSubmitting(true)

      await apiClient.updateAporte(
        aporte.id,
        {
          fecha,
          descripcion,
          estado
        },
        usuarioId
      )

      toast.success("Aporte actualizado")
      onSuccess()
      onOpenChange(false)

    } catch (error) {
      console.error(error)
      toast.error("Error actualizando aporte")
    } finally {
      setSubmitting(false)
    }
  }

  if (!aporte) return null

  const evidenciasDelAporte = evidencias.filter(ev =>
    aporte.evidenciaIds?.includes(ev.id!)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar aporte</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          <div>
            <label className="text-xs font-medium mb-1 block">
              Fecha
            </label>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />

              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full pl-10 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">
              Descripción
            </label>

            <textarea
              rows={4}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">
              Estado
            </label>

            <input
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-2 block">
              Evidencias asociadas
            </label>

            <div className="space-y-2">
              {evidenciasDelAporte.map(ev => (
                <div
                  key={ev.id}
                  className="p-2 bg-muted rounded-lg text-sm"
                >
                  {ev.nombre}
                </div>
              ))}
            </div>
          </div>

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