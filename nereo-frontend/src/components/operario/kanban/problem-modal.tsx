"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export interface ProblemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string | null;
  onSubmit: (bookingId: string, notes: string) => Promise<void>;
}

export function ProblemModal({
  open,
  onOpenChange,
  bookingId,
  onSubmit,
}: ProblemModalProps) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!bookingId || !notes.trim()) return;
    setLoading(true);
    try {
      await onSubmit(bookingId, notes);
      setNotes("");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reportar problema</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="problem-notes">¿Qué pasó?</Label>
            <Textarea
              id="problem-notes"
              placeholder="Describí el problema brevemente..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="text-base min-h-[100px]"
              autoFocus
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!notes.trim() || loading}
            className="w-full min-h-[48px] text-base"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar reporte
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
