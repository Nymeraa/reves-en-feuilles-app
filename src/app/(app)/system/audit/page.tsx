'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Audit & Tests</h2>
          <p className="text-slate-500">Vérification de l'intégrité du système</p>
        </div>
      </div>

      <Card className="border-l-4 border-l-amber-500 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            Fonctionnalité désactivée
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-amber-800">
            L'audit système est temporairement désactivé durant la migration vers l'API.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
