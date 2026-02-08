'use client';

import { useState } from 'react';
import { AuditLog, AuditAction, AuditEntity, AuditSeverity } from '@/types/audit';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Eye, Search, Download } from 'lucide-react';

interface AuditLogTableProps {
  initialLogs: AuditLog[];
}

export function AuditLogTable({ initialLogs }: AuditLogTableProps) {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const filtered = initialLogs.filter((log) => {
    const matchesSearch =
      log.entityId?.toLowerCase().includes(search.toLowerCase()) ||
      log.correlationId?.toLowerCase().includes(search.toLowerCase()) ||
      log.actorUserId?.toLowerCase().includes(search.toLowerCase()) ||
      log.actorName?.toLowerCase().includes(search.toLowerCase());

    const matchesEntity = entityFilter === 'ALL' || log.entity === entityFilter;
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesSeverity = severityFilter === 'ALL' || log.severity === severityFilter;

    return matchesSearch && matchesEntity && matchesAction && matchesSeverity;
  });

  const getSeverityBadge = (s: AuditSeverity) => {
    switch (s) {
      case AuditSeverity.INFO:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50';
      case AuditSeverity.WARNING:
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50';
      case AuditSeverity.ERROR:
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50';
      default:
        return 'bg-muted dark:bg-muted/50 text-muted-foreground';
    }
  };

  const downloadCsv = () => {
    const header = ['Timestamp', 'Action', 'Entity', 'EntityID', 'Severity', 'User', 'Details'];
    const rows = filtered.map((l) => [
      l.timestamp,
      l.action,
      l.entity,
      l.entityId || '-',
      l.severity,
      l.actorName || l.actorUserId || '-',
      JSON.stringify(l.metadata || {}),
    ]);

    const csvContent = [header, ...rows].map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${new Date().toISOString()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher (ID, User, Correlation)..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Entité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toutes Entités</SelectItem>
            {Object.values(AuditEntity).map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toutes Actions</SelectItem>
            {Object.values(AuditAction).map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sévérité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tout</SelectItem>
            {Object.values(AuditSeverity).map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={downloadCsv}>
          <Download className="w-4 h-4 mr-2" />
          CSV
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Sévérité</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entité</TableHead>
              <TableHead>ID / Source</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="text-right">Détails</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 50).map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString('fr-FR')}
                </TableCell>
                <TableCell>
                  <Badge className={getSeverityBadge(log.severity)} variant="secondary">
                    {log.severity}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{log.action}</TableCell>
                <TableCell>{log.entity}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {log.entityId}
                  {log.correlationId && log.correlationId !== log.entityId && (
                    <div className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">
                      Ref: {log.correlationId}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  <div className="font-medium">{log.actorName || '-'}</div>
                  <div className="text-xs text-muted-foreground">{log.actorUserId}</div>
                </TableCell>
                <TableCell className="text-right">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Détail du Log {log.id}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Action:</strong> {log.action}
                          </div>
                          <div>
                            <strong>Entity:</strong> {log.entity}
                          </div>
                          <div>
                            <strong>Date:</strong> {log.timestamp}
                          </div>
                          <div>
                            <strong>User:</strong> {log.actorName} ({log.actorUserId})
                          </div>
                        </div>
                        <div className="bg-slate-900 dark:bg-slate-950 text-slate-50 p-4 rounded-md overflow-x-auto text-xs font-mono">
                          <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Aucun log trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="text-xs text-muted-foreground text-center">
        Affichage des {Math.min(filtered.length, 50)} derniers résultats sur {filtered.length}{' '}
        trouvés.
      </div>
    </div>
  );
}
