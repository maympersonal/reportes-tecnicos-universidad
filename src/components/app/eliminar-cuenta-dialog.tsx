"use client"

import { useState } from "react"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { apiFetch } from "@/lib/api"
import { useAppStore } from "@/lib/store"
import { toast } from "sonner"
import { ShieldAlert, Trash2, Loader2 } from "lucide-react"
import { INSTITUCION } from "@/lib/constants"

export function EliminarCuentaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const logout = useAppStore((s) => s.logout)
  const setView = useAppStore((s) => s.setView)
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (confirm !== "ELIMINAR") {
      toast.error('Debes escribir "ELIMINAR" para confirmar')
      return
    }
    setLoading(true)
    try {
      await apiFetch(`/auth/me/eliminar`, {
        method: "DELETE",
        body: JSON.stringify({ confirm }),
      })
      toast.success("Cuenta eliminada y datos anonimizados")
      logout()
      setView("dashboard")
      onOpenChange(false)
    } catch (e) {
      toast.error((e as Error).message || "No se pudo eliminar la cuenta")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            Eliminar mi cuenta
          </DialogTitle>
          <DialogDescription>
            Ejercicio del derecho al olvido (Ley 1581). Esta acción es irreversible.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Alert variant="destructive">
            <AlertTitle>Atención</AlertTitle>
            <AlertDescription className="space-y-1 text-xs">
              <p>• Tus reportes creados se conservarán pero se anonimizarán los datos del usuario afectado.</p>
              <p>• Se eliminarán tus sesiones y notificaciones.</p>
              <p>• Se desactivará la cuenta y se anonimizarán tus datos personales.</p>
              <p>• Contacto para reclamos: {INSTITUCION.correo}</p>
            </AlertDescription>
          </Alert>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">
              Escribe <span className="font-mono font-semibold">ELIMINAR</span> para confirmar
            </Label>
            <Input
              id="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="ELIMINAR"
              autoComplete="off"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={submit} disabled={loading || confirm !== "ELIMINAR"}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            <span className="ml-2">Eliminar cuenta</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
