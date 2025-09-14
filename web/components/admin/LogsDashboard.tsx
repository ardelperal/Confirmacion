'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Trash2, Search, Filter } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  category?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  error?: string;
  file: string;
  [key: string]: any;
}

interface LogStats {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  authAttempts: number;
  adminActions: number;
  downloads: number;
  sessionAccess: number;
  last24Hours: {
    total: number;
    errors: number;
    auth: number;
    admin: number;
  };
  categories: Record<string, number>;
  levels: Record<string, number>;
}

interface LogsData {
  logs: LogEntry[];
  stats: LogStats;
  query: any;
}

export default function LogsDashboard() {
  const [data, setData] = useState<LogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    level: '',
    category: '',
    search: '',
    limit: '100'
  });
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/admin/logs?${params}`);
      if (!response.ok) {
        throw new Error('Error al cargar logs');
      }

      const result = await response.json();
      setData(result.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cleanLogs = async (days: number) => {
    try {
      const response = await fetch(`/api/admin/logs?days=${days}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Error al limpiar logs');
      }

      const result = await response.json();
      alert(result.message);
      fetchLogs(); // Refrescar después de limpiar
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchLogs, 30000); // Refrescar cada 30 segundos
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, filters]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'destructive';
      case 'warn': return 'secondary';
      case 'info': return 'default';
      case 'http': return 'outline';
      case 'debug': return 'secondary';
      default: return 'default';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'authentication': return 'destructive';
      case 'administration': return 'default';
      case 'security': return 'destructive';
      case 'download': return 'secondary';
      case 'session_access': return 'outline';
      default: return 'secondary';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-ES');
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Cargando logs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error: {error}
        <Button onClick={fetchLogs} className="ml-4">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      {data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.totalLogs.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Últimas 24h: {data.stats.last24Hours.total}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Errores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{data.stats.errorCount}</div>
              <p className="text-xs text-muted-foreground">
                Últimas 24h: {data.stats.last24Hours.errors}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Autenticaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.authAttempts}</div>
              <p className="text-xs text-muted-foreground">
                Últimas 24h: {data.stats.last24Hours.auth}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Descargas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.downloads}</div>
              <p className="text-xs text-muted-foreground">
                Accesos a sesiones: {data.stats.sessionAccess}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Logs del Sistema</span>
            <div className="flex items-center space-x-2">
              <Button
                variant={autoRefresh ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto
              </Button>
              <Button onClick={fetchLogs} size="sm">
                <RefreshCw className="h-4 w-4" />
                Refrescar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm('¿Eliminar logs de más de 30 días?')) {
                    cleanLogs(30);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                Limpiar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Buscar en logs..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-64"
              />
            </div>
            
            <Select
              value={filters.level}
              onValueChange={(value) => setFilters(prev => ({ ...prev, level: value }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Nivel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="http">HTTP</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.category}
              onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                <SelectItem value="authentication">Auth</SelectItem>
                <SelectItem value="administration">Admin</SelectItem>
                <SelectItem value="security">Seguridad</SelectItem>
                <SelectItem value="download">Descargas</SelectItem>
                <SelectItem value="session_access">Accesos</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={fetchLogs} size="sm">
              <Filter className="h-4 w-4" />
              Aplicar
            </Button>
          </div>

          {/* Lista de logs */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data?.logs.map((log, index) => (
              <div key={index} className="border rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant={getLevelColor(log.level)}>
                      {log.level.toUpperCase()}
                    </Badge>
                    {log.category && (
                      <Badge variant={getCategoryColor(log.category)}>
                        {log.category}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  {log.responseTime && (
                    <span className="text-xs text-muted-foreground">
                      {log.responseTime}ms
                    </span>
                  )}
                </div>
                
                <div className="font-medium mb-1">{log.message}</div>
                
                {(log.method || log.url || log.ip) && (
                  <div className="text-xs text-muted-foreground space-x-2">
                    {log.method && <span>{log.method}</span>}
                    {log.url && <span>{log.url}</span>}
                    {log.ip && <span>IP: {log.ip}</span>}
                    {log.statusCode && (
                      <span className={log.statusCode >= 400 ? 'text-red-600' : ''}>
                        {log.statusCode}
                      </span>
                    )}
                  </div>
                )}
                
                {log.error && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-800">
                    {log.error}
                  </div>
                )}
              </div>
            ))}
            
            {data?.logs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron logs con los filtros aplicados.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}