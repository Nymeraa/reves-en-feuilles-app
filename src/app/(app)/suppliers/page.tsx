import { SupplierService } from '@/services/supplier-service'
import SuppliersClientPage from './client-page'

export default async function SuppliersPage() {
    const suppliers = await SupplierService.getSuppliers();

    return <SuppliersClientPage initialSuppliers={suppliers} />
}
