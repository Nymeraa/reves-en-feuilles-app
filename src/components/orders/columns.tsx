import { ColumnDef } from '@tanstack/react-table'
import { Order, OrderStatus } from '@/types/order'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { MoreHorizontal, Edit, Eye } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export const columns: ColumnDef<Order>[] = [
    {
        accessorKey: 'orderNumber',
        header: 'N° commande',
        cell: ({ row }) => <div className="font-mono text-xs">{row.original.orderNumber || row.original.id}</div>,
    },
    {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: ({ row }) => {
            return <div className="text-sm">{new Date(row.getValue('createdAt')).toLocaleDateString('fr-FR')}</div>
        }
    },
    {
        accessorKey: 'source',
        header: 'Source',
        cell: ({ row }) => <div className="text-sm text-slate-500">{row.original.source || '-'}</div>
    },
    {
        accessorKey: 'status',
        header: 'Statut',
        cell: ({ row }) => {
            const status = row.getValue('status') as OrderStatus
            let variant: "default" | "secondary" | "destructive" | "outline" = "secondary"
            let label = status as string

            if (status === OrderStatus.PAID) {
                variant = "default"
                label = "Payée"
            } else if (status === OrderStatus.SHIPPED) {
                variant = "outline"
                label = "Expédiée"
            } else if (status === OrderStatus.DELIVERED) {
                variant = "outline"
                label = "Livrée"
            } else if (status === OrderStatus.REFUNDED) {
                variant = "secondary"
                label = "Remboursée"
            } else if (status === OrderStatus.CANCELLED) {
                variant = "destructive"
                label = "Annulée"
            } else {
                label = "Brouillon"
            }

            return <Badge variant={variant}>{label}</Badge>
        }
    },
    {
        accessorKey: 'customerName',
        header: 'Client',
    },
    {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => <div className="text-xs text-slate-500">{row.original.email || '-'}</div>
    },
    {
        accessorKey: 'totalAmount',
        header: 'Total',
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue('totalAmount'))
            return <div className="font-mono font-bold">€{amount.toFixed(2)}</div>
        }
    },
    {
        accessorKey: 'margin',
        header: 'Marge',
        cell: ({ row }) => {
            const margin = row.original.margin || 0
            const color = margin >= 30 ? 'text-green-600' : margin >= 20 ? 'text-yellow-600' : 'text-red-600'
            return <div className={`font-mono ${color}`}>{margin.toFixed(1)}%</div>
        }
    },
    {
        accessorKey: 'netProfit',
        header: 'Profit',
        cell: ({ row }) => {
            const profit = row.original.netProfit || 0
            const color = profit >= 0 ? 'text-green-600' : 'text-red-600'
            return <div className={`font-mono font-bold ${color}`}>€{profit.toFixed(2)}</div>
        }
    },
    {
        id: 'actions',
        cell: ({ row }) => {
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                            <Link href={`/orders/${row.original.id}`} className="flex items-center w-full">
                                <Eye className="mr-2 h-4 w-4" /> Voir détails
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
    }
]
