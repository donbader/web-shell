import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { getResourceStats, formatBytes, formatPercent, getUsageColor } from '../services/resourceService';
import type { SystemStats, ContainerStats } from '../types/resources';
import { Activity, Cpu, HardDrive, Network, Server, Users } from 'lucide-react';

export function ResourceMonitor() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getResourceStats();
        setStats(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load resource statistics');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchStats();

    // Auto-refresh every 2 seconds if enabled
    if (autoRefresh) {
      const interval = setInterval(fetchStats, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading resource statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Resource Monitor</h2>
          <p className="text-sm text-muted-foreground">
            Real-time system resource usage • Updated{' '}
            {new Date(stats.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={autoRefresh ? 'default' : 'secondary'}>
            <Activity className="w-3 h-3 mr-1" />
            {autoRefresh ? 'Live' : 'Paused'}
          </Badge>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="text-sm px-3 py-1 rounded border hover:bg-accent"
          >
            {autoRefresh ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Sessions"
          value={stats.summary.totalSessions.toString()}
          icon={<Users className="w-4 h-4" />}
          badge={
            <div className="flex gap-1">
              <Badge variant="default">{stats.summary.activeSessions} active</Badge>
              <Badge variant="secondary">{stats.summary.idleSessions} idle</Badge>
            </div>
          }
        />
        <SummaryCard
          title="Total Memory"
          value={formatBytes(stats.summary.totalMemoryUsage)}
          icon={<HardDrive className="w-4 h-4" />}
          subtitle="Session containers"
        />
        <SummaryCard
          title="Total CPU"
          value={formatPercent(stats.summary.totalCpuPercent)}
          icon={<Cpu className="w-4 h-4" />}
          subtitle="Session containers"
        />
        <SummaryCard
          title="Services"
          value="2"
          icon={<Server className="w-4 h-4" />}
          subtitle="Backend + Frontend"
        />
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="sessions">Sessions ({stats.sessions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ServiceCard
              title="Backend (API + WebSocket)"
              cpuPercent={stats.backend.cpuPercent}
              memoryUsage={stats.backend.memoryUsage}
              memoryLimit={stats.backend.memoryLimit}
              memoryPercent={stats.backend.memoryPercent}
            />
            <ServiceCard
              title="Frontend (nginx)"
              cpuPercent={stats.frontend.cpuPercent}
              memoryUsage={stats.frontend.memoryUsage}
              memoryLimit={stats.frontend.memoryLimit}
              memoryPercent={stats.frontend.memoryPercent}
            />
          </div>

          {stats.sessions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Resource Consumers</CardTitle>
                <CardDescription>Session containers using most resources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.sessions
                    .sort((a, b) => b.memoryPercent - a.memoryPercent)
                    .slice(0, 5)
                    .map((session) => (
                      <SessionRow key={session.containerId} session={session} compact />
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <ServiceCard
            title="Backend Container"
            cpuPercent={stats.backend.cpuPercent}
            memoryUsage={stats.backend.memoryUsage}
            memoryLimit={stats.backend.memoryLimit}
            memoryPercent={stats.backend.memoryPercent}
            detailed
          />
          <ServiceCard
            title="Frontend Container"
            cpuPercent={stats.frontend.cpuPercent}
            memoryUsage={stats.frontend.memoryUsage}
            memoryLimit={stats.frontend.memoryLimit}
            memoryPercent={stats.frontend.memoryPercent}
            detailed
          />
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          {stats.sessions.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No active sessions
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {stats.sessions.map((session) => (
                <SessionCard key={session.containerId} session={session} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
}

function SummaryCard({ title, value, icon, subtitle, badge }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        {badge && <div className="mt-2">{badge}</div>}
      </CardContent>
    </Card>
  );
}

interface ServiceCardProps {
  title: string;
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
  detailed?: boolean;
}

function ServiceCard({
  title,
  cpuPercent,
  memoryUsage,
  memoryLimit,
  memoryPercent,
  detailed = false,
}: ServiceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>
          {formatBytes(memoryUsage)} / {formatBytes(memoryLimit)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              <span>Memory</span>
            </div>
            <span className={getUsageColor(memoryPercent)}>{formatPercent(memoryPercent)}</span>
          </div>
          <Progress value={memoryPercent} className="h-2" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              <span>CPU</span>
            </div>
            <span className={getUsageColor(cpuPercent)}>{formatPercent(cpuPercent)}</span>
          </div>
          <Progress value={Math.min(cpuPercent, 100)} className="h-2" />
        </div>

        {detailed && (
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t">
            <div>
              <div className="font-medium">Memory Limit</div>
              <div>{formatBytes(memoryLimit)}</div>
            </div>
            <div>
              <div className="font-medium">CPU Limit</div>
              <div>1.0 cores</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SessionCardProps {
  session: ContainerStats;
}

function SessionCard({ session }: SessionCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-mono">{session.containerName}</CardTitle>
          <Badge variant={session.cpuPercent > 10 ? 'default' : 'secondary'}>
            {session.cpuPercent > 10 ? 'Active' : 'Idle'}
          </Badge>
        </div>
        <CardDescription className="font-mono text-xs">
          {session.containerId.substring(0, 12)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                <span>Memory</span>
              </div>
              <span className={getUsageColor(session.memoryPercent)}>
                {formatPercent(session.memoryPercent)}
              </span>
            </div>
            <Progress value={session.memoryPercent} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {formatBytes(session.memoryUsage)} / {formatBytes(session.memoryLimit)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                <span>CPU</span>
              </div>
              <span className={getUsageColor(session.cpuPercent)}>
                {formatPercent(session.cpuPercent)}
              </span>
            </div>
            <Progress value={Math.min(session.cpuPercent, 100)} className="h-2" />
            <div className="text-xs text-muted-foreground">{session.pids} processes</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground pt-2 border-t">
          <div>
            <Network className="w-3 h-3 inline mr-1" />
            RX: {formatBytes(session.networkRx)}
          </div>
          <div>
            <Network className="w-3 h-3 inline mr-1" />
            TX: {formatBytes(session.networkTx)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SessionRowProps {
  session: ContainerStats;
  compact?: boolean;
}

function SessionRow({ session, compact }: SessionRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex-1">
        <div className="text-sm font-mono">{session.containerName}</div>
        {!compact && (
          <div className="text-xs text-muted-foreground">
            {formatBytes(session.memoryUsage)} • {formatPercent(session.cpuPercent)} CPU
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="w-24">
          <div className="flex justify-between text-xs mb-1">
            <span>MEM</span>
            <span className={getUsageColor(session.memoryPercent)}>
              {formatPercent(session.memoryPercent)}
            </span>
          </div>
          <Progress value={session.memoryPercent} className="h-1" />
        </div>
        <div className="w-24">
          <div className="flex justify-between text-xs mb-1">
            <span>CPU</span>
            <span className={getUsageColor(session.cpuPercent)}>
              {formatPercent(session.cpuPercent)}
            </span>
          </div>
          <Progress value={Math.min(session.cpuPercent, 100)} className="h-1" />
        </div>
      </div>
    </div>
  );
}
