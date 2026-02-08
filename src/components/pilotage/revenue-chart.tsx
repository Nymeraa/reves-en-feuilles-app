'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'

interface RevenueChartProps {
    data: { date: string; revenue: number; profit: number }[]
}

export function RevenueChart({ data }: RevenueChartProps) {
    if (!data || data.length === 0) {
        return <div className="h-full flex items-center justify-center text-slate-400">Aucune donnée disponible</div>
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: any) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                />
                <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: any) => `${value}€`}
                />
                <Tooltip
                    cursor={{ fill: '#F1F5F9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Bar dataKey="revenue" name="Chiffre d'Affaires" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="profit" name="Marge Nette" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
        </ResponsiveContainer>
    )
}
