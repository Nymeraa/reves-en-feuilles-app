import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function BackupPage() {
  return (
    <div className="container mx-auto max-w-2xl py-20">
      <Card className="border-slate-200 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Fonctionnalité désactivée
          </CardTitle>
          <CardDescription className="text-slate-500 text-lg">
            La sauvegarde et la restauration sont désactivées.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 text-center">
          <p className="text-slate-600">
            Pour des raisons de sécurité et de stabilité du système, les fonctions d'export global
            et de restauration de base de données ne sont plus accessibles.
          </p>
          <div className="pt-4">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4" />
                Retour au Tableau de bord
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
