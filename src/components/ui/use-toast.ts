// Simplified version of shadcn/ui toast hook
import { useState } from "react"

export const useToast = () => {
    const [toasts, setToasts] = useState<any[]>([])

    const toast = ({ title, description, variant }: any) => {
        console.log("Toast:", title, description)
        // In a real app, this would add to a provider state
        alert(`${title}\n${description || ''}`)
    }

    return { toast, toasts }
}
