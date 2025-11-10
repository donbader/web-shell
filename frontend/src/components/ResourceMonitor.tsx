import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  getResourceStats,
  getSessions,
  terminateSession,
  terminateOrphanedContainer,
  formatBytes,
  formatPercent,
  getUsageColor,
} from '../services/resourceService';
import type { SystemStats, ContainerStats, SessionWithMetadata } from '../types/resources';
import { Activity, Cpu, HardDrive, Network, Server, Users, XCircle, Loader2 } from 'lucide-react';

export function ResourceMonitor() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [sessions, setSessions] = useState<SessionWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [terminatingSession, setTerminatingSession] = useState<string | null>(null);
  const [confirmTerminateSession, setConfirmTerminateSession] = useState<SessionWithMetadata | null>(
    null
  );
  const [terminatingOrphaned, setTerminatingOrphaned] = useState<string | null>(null);
  const [confirmTerminateOrphaned, setConfirmTerminateOrphaned] = useState<ContainerStats | null>(
    null
  );

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsData, sessionsData] = await Promise.all([
          getResourceStats(),
          getSessions(),
        ]);
        setStats(statsData);
        setSessions(sessionsData.sessions);
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

  const handleTerminateSession = async (session: SessionWithMetadata) => {
    setTerminatingSession(session.sessionId);
    setConfirmTerminateSession(null);

    try {
      await terminateSession(session.sessionId);
      // Refresh sessions list immediately
      const sessionsData = await getSessions();
      setSessions(sessionsData.sessions);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to terminate session'
      );
    } finally {
      setTerminatingSession(null);
    }
  };

  const handleTerminateOrphaned = async (container: ContainerStats) => {
    setTerminatingOrphaned(container.containerId);
    setConfirmTerminateOrphaned(null);

    try {
      await terminateOrphanedContainer(container.containerId);
      // Refresh stats immediately to remove from list
      const statsData = await getResourceStats();
      setStats(statsData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to terminate orphaned container'
      );
    } finally {
      setTerminatingOrphaned(null);
    }
  };

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
    <>
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

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

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
            <TabsTrigger value="sessions">Sessions ({sessions.length})</TabsTrigger>
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
            {sessions.length === 0 && (!stats || stats.sessions.filter(s => s.orphaned).length === 0) ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No active sessions
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Tracked Sessions */}
                {sessions.length > 0 && (
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <SessionCardWithMetadata
                        key={session.sessionId}
                        session={session}
                        containerStats={stats?.sessions.find(
                          (s) => s.containerId === session.containerId
                        )}
                        onTerminate={() => setConfirmTerminateSession(session)}
                        isTerminating={terminatingSession === session.sessionId}
                      />
                    ))}
                  </div>
                )}

                {/* Orphaned Containers */}
                {stats && stats.sessions.filter(s => s.orphaned).length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-orange-600 dark:text-orange-400">
                      <XCircle className="w-4 h-4" />
                      <span>Orphaned Containers ({stats.sessions.filter(s => s.orphaned).length})</span>
                    </div>
                    {stats.sessions
                      .filter(s => s.orphaned)
                      .map((container) => (
                        <OrphanedContainerCard
                          key={container.containerId}
                          container={container}
                          onTerminate={() => setConfirmTerminateOrphaned(container)}
                          isTerminating={terminatingOrphaned === container.containerId}
                        />
                      ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmTerminateSession !== null}
        onOpenChange={(open) => !open && setConfirmTerminateSession(null)}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Terminate Terminal Session?</AlertDialogTitle>
          <AlertDialogDescription>
            This will immediately terminate the terminal session and close the connection.
            {confirmTerminateSession && (
              <div className="mt-2 space-y-1 text-sm">
                <div>
                  <strong>Container:</strong> {confirmTerminateSession.containerName}
                </div>
                <div>
                  <strong>User:</strong> {confirmTerminateSession.userId}
                </div>
                {confirmTerminateSession.clientIp && (
                  <div>
                    <strong>IP:</strong> {confirmTerminateSession.clientIp}
                  </div>
                )}
                <div>
                  <strong>Environment:</strong> {confirmTerminateSession.environment}
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmTerminateSession(null)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              confirmTerminateSession && handleTerminateSession(confirmTerminateSession)
            }
          >
            Terminate Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>

      {/* Orphaned Container Confirmation Dialog */}
      <AlertDialog
        open={confirmTerminateOrphaned !== null}
        onOpenChange={(open) => !open && setConfirmTerminateOrphaned(null)}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Terminate Orphaned Container?</AlertDialogTitle>
          <AlertDialogDescription>
            This will forcefully stop and remove this orphaned container.
            {confirmTerminateOrphaned && (
              <div className="mt-2 space-y-1 text-sm">
                <div>
                  <strong>Container:</strong> {confirmTerminateOrphaned.containerName}
                </div>
                <div>
                  <strong>ID:</strong> {confirmTerminateOrphaned.containerId.substring(0, 12)}
                </div>
                <div className="mt-2 text-orange-600 dark:text-orange-400">
                  ⚠️ This container is not tracked by any active session and will be permanently removed.
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmTerminateOrphaned(null)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              confirmTerminateOrphaned && handleTerminateOrphaned(confirmTerminateOrphaned)
            }
            className="bg-red-600 hover:bg-red-700"
          >
            Terminate Container
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </>
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

interface SessionCardWithMetadataProps {
  session: SessionWithMetadata;
  containerStats?: ContainerStats;
  onTerminate: () => void;
  isTerminating: boolean;
}

function SessionCardWithMetadata({
  session,
  containerStats,
  onTerminate,
  isTerminating,
}: SessionCardWithMetadataProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-base font-mono">{session.containerName}</CardTitle>
            <CardDescription className="font-mono text-xs mt-1">
              {session.containerId.substring(0, 12)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={session.connected ? 'default' : 'secondary'}>
              {session.connected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Badge variant={containerStats && containerStats.cpuPercent > 10 ? 'default' : 'secondary'}>
              {containerStats && containerStats.cpuPercent > 10 ? 'Active' : 'Idle'}
            </Badge>
            <button
              onClick={onTerminate}
              disabled={isTerminating}
              className="px-3 py-1 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isTerminating ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Terminating...</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3" />
                  <span>Terminate</span>
                </>
              )}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Session Metadata */}
        <div className="grid grid-cols-2 gap-2 text-xs border-b pb-3">
          <div>
            <span className="text-muted-foreground">User:</span>{' '}
            <span className="font-mono">{session.userId}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Environment:</span>{' '}
            <span className="font-mono">{session.environment}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Shell:</span>{' '}
            <span className="font-mono">{session.shell}</span>
          </div>
          {session.clientIp && (
            <div>
              <span className="text-muted-foreground">Client IP:</span>{' '}
              <span className="font-mono">{session.clientIp}</span>
            </div>
          )}
        </div>

        {/* Resource Stats */}
        {containerStats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  <span>Memory</span>
                </div>
                <span className={getUsageColor(containerStats.memoryPercent)}>
                  {formatPercent(containerStats.memoryPercent)}
                </span>
              </div>
              <Progress value={containerStats.memoryPercent} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {formatBytes(containerStats.memoryUsage)} / {formatBytes(containerStats.memoryLimit)}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  <span>CPU</span>
                </div>
                <span className={getUsageColor(containerStats.cpuPercent)}>
                  {formatPercent(containerStats.cpuPercent)}
                </span>
              </div>
              <Progress value={Math.min(containerStats.cpuPercent, 100)} className="h-2" />
              <div className="text-xs text-muted-foreground">{containerStats.pids} processes</div>
            </div>
          </div>
        )}

        {/* Network Stats */}
        {containerStats && (
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground pt-2 border-t">
            <div>
              <Network className="w-3 h-3 inline mr-1" />
              RX: {formatBytes(containerStats.networkRx)}
            </div>
            <div>
              <Network className="w-3 h-3 inline mr-1" />
              TX: {formatBytes(containerStats.networkTx)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface OrphanedContainerCardProps {
  container: ContainerStats;
  onTerminate: () => void;
  isTerminating: boolean;
}

function OrphanedContainerCard({
  container,
  onTerminate,
  isTerminating,
}: OrphanedContainerCardProps) {
  return (
    <Card className="border-orange-200 dark:border-orange-900">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-mono">{container.containerName}</CardTitle>
              <Badge variant="destructive" className="text-xs">
                Orphaned
              </Badge>
            </div>
            <CardDescription className="font-mono text-xs mt-1">
              {container.containerId.substring(0, 12)}
            </CardDescription>
          </div>
          <button
            onClick={onTerminate}
            disabled={isTerminating}
            className="px-3 py-1 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {isTerminating ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Terminating...</span>
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3" />
                <span>Terminate</span>
              </>
            )}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 p-3 rounded-md">
          ⚠️ This container is not tracked by any active session. It may be left over from a server restart or crash.
        </div>

        {/* Resource Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                <span>Memory</span>
              </div>
              <span className={getUsageColor(container.memoryPercent)}>
                {formatPercent(container.memoryPercent)}
              </span>
            </div>
            <Progress value={container.memoryPercent} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {formatBytes(container.memoryUsage)} / {formatBytes(container.memoryLimit)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                <span>CPU</span>
              </div>
              <span className={getUsageColor(container.cpuPercent)}>
                {formatPercent(container.cpuPercent)}
              </span>
            </div>
            <Progress value={Math.min(container.cpuPercent, 100)} className="h-2" />
            <div className="text-xs text-muted-foreground">{container.pids} processes</div>
          </div>
        </div>

        {/* Network Stats */}
        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground pt-2 border-t">
          <div>
            <Network className="w-3 h-3 inline mr-1" />
            RX: {formatBytes(container.networkRx)}
          </div>
          <div>
            <Network className="w-3 h-3 inline mr-1" />
            TX: {formatBytes(container.networkTx)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
