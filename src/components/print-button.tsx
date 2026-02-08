'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

export function PrintButton() {
    return (
        <Button
            onClick={() => window.print()}
            className="print:hidden bg-slate-900 text-white gap-2 shadow-lg hover:bg-slate-800"
        >
            <Printer className="w-4 h-4" />
            Imprimer / PDF
        </Button>
    )
}
