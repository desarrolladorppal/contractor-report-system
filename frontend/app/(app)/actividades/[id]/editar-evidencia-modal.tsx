"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Evidencia {
  id?: string
  nombre: string
  tipo: string
  drive?: {
    url?: string
  }
}

interface EditarEvidenciaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  evidencia: Evidencia | null
}

export function EditarEvidenciaModal({
  open,
  onOpenChange,
  evidencia
}: EditarEvidenciaModalProps) {
  if (!evidencia) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar evidencia</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input defaultValue={evidencia.nombre} />

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>

            <Button>
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}