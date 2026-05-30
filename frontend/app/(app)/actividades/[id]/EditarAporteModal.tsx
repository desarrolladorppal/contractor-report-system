"use client"

import { useState, useEffect } from "react"
import {
  Calendar,
  Save,
  Loader2,
  AlertCircle,
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

import { apiClient } from "@/lib/api-client"
import { useContrato } from "@/contexts/contrato-context"
import { EvidenciaUpload } from "@/components/evidencia-upload"
import { toColombiaDate } from "@/lib/utils"
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
  actividadId: string
  usuarioId: string
  onSuccess: () => void
}

export function EditarAporteModal({
  open,
  onOpenChange,
  aporte,
  evidencias,
  actividadId,
  usuarioId,
  onSuccess
}: Props) {
  const { contratoActivo } = useContrato()

  const [fecha, setFecha] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errorFecha, setErrorFecha] = useState<string | null>(null)
  const [fechaFinContrato, setFechaFinContrato] = useState<string | null>(null)
  const [evidenciasGuardadas, setEvidenciasGuardadas] = useState<any[]>([])

  // cargar contrato
  useEffect(() => {
    const cargarFechaFin = async () => {
      if (!contratoActivo) return

      const contrato = await apiClient.getContrato(contratoActivo)
      setFechaFinContrato(contrato?.fechaFin || null)
    }

    cargarFechaFin()
  }, [contratoActivo])

  // precargar aporte
  useEffect(() => {
    if (aporte && open) {
      setFecha(
        aporte.fecha
          ? new Date(aporte.fecha).toISOString().split("T")[0]
          : ""
      )

      setDescripcion(aporte.descripcion || "")

      const evidenciasDelAporte = evidencias.filter(ev =>
        aporte.evidenciaIds?.includes(ev.id!)
      )

      setEvidenciasGuardadas(evidenciasDelAporte)
    }
  }, [aporte, open, evidencias])

  // validar fecha
  useEffect(() => {
    if (fechaFinContrato && fecha) {
      const fechaSeleccionada = new Date(fecha)
      const fechaFin = new Date(fechaFinContrato)

      fechaSeleccionada.setHours(0, 0, 0, 0)
      fechaFin.setHours(0, 0, 0, 0)

      if (fechaSeleccionada > fechaFin) {
        setErrorFecha("La fecha supera la finalización del contrato")
      } else {
        setErrorFecha(null)
      }
    }
  }, [fecha, fechaFinContrato])

  const handleEvidenciaGuardada = (ev: any) => {
    setEvidenciasGuardadas(prev => [...prev, ev])
    toast.success("Evidencia agregada")
  }

  const handleEliminarEvidencia = (index: number) => {
    setEvidenciasGuardadas(prev =>
      prev.filter((_, i) => i !== index)
    )
  }

  const handleGuardar = async () => {
    if (!aporte?.id) return

    try {
      setSubmitting(true)

      const evidenciaIds = evidenciasGuardadas.map(
        ev => ev.id || ev._id
      )

      await apiClient.updateAporte(
        aporte.id,
        {
          fecha: toColombiaDate(fecha),
          descripcion,
          estado: aporte.estado || "completado",
          evidenciaIds
        },
        usuarioId
      )

      toast.success("Aporte actualizado")

      await onSuccess()
      onOpenChange(false)

    } catch (error) {
      console.error("Error actualizando aporte:", error)
      toast.error("Error al actualizar")
    } finally {
      setSubmitting(false)
    }
  }

  if (!aporte) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar aporte</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* Fecha */}
          <div>
            <label className="text-xs font-medium mb-1 block">
              Fecha del aporte
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

            {errorFecha && (
              <p className="text-xs text-destructive flex gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                {errorFecha}
              </p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-medium mb-1 block">
              Descripción
            </label>

            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg resize-none"
            />
          </div>

          {/* Evidencias */}
          <div className="space-y-3">
            <label className="text-xs font-medium">
              Evidencias
            </label>

            <EvidenciaUpload
              actividadId={actividadId}
              onSuccess={handleEvidenciaGuardada}
            />

            {evidenciasGuardadas.map((ev, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg"
              >
                {ev.tipo === "archivo" && <Upload className="h-4 w-4" />}
                {ev.tipo === "enlace" && <Link2 className="h-4 w-4" />}
                {ev.tipo === "nota" && <FileText className="h-4 w-4" />}

                <span className="flex-1 truncate text-sm">
                  {ev.nombre}
                </span>

                <button
                  type="button"
                  onClick={() => handleEliminarEvidencia(idx)}
                >
                  <X className="h-4 w-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleGuardar}
            disabled={submitting || !!errorFecha}
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