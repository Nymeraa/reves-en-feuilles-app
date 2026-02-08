import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Trash2, Loader2 } from 'lucide-react'

interface DeleteConfirmButtonProps {
    id: string
    action: (id: string) => Promise<{ error?: string, success?: boolean }>
    title?: string
    description?: string
    className?: string
}

export function DeleteConfirmButton({ id, action, title = "Supprimer cet élément ?", description = "Cette action est irréversible.", className }: DeleteConfirmButtonProps) {
    const [open, setOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const res = await action(id)
            if (res.error) {
                console.error(res.error)
            } else {
                setOpen(false)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className={`h-8 w-8 text-slate-400 hover:text-red-600 ${className}`}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>Annuler</Button>
                    <Button
                        variant="destructive"
                        onClick={(e) => {
                            e.preventDefault();
                            handleDelete();
                        }}
                        disabled={isDeleting}
                    >
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Supprimer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
