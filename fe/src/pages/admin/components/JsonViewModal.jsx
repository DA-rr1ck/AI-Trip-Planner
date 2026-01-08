import React from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export default function JsonViewModal({ open, onClose, title, data }) {
    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!v) onClose()
            }}
        >
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <pre className="max-h-[70vh] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </DialogContent>
        </Dialog>
    )
}
