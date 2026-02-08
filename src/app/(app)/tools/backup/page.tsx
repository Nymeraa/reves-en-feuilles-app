'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function BackupPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sauvegardes</h2>
        <p className="text-slate-500">Gérez vos données</p>
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
            La restauration de sauvegarde est temporairement désactivée durant la migration vers
            l'API.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
