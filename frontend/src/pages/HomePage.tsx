import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle2,
  Database,
  FileText,
  HardDrive,
  Layers,
  Lock,
  Mail,
  RefreshCw,
  Shield,
  UploadCloud,
  Zap,
} from 'lucide-react';
import { fetchHealth } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function HomePage() {
  const {
    data: health,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['backendHealth'],
    queryFn: fetchHealth,
    retry: 1,
    refetchInterval: 30000,
  });

  const phases = [
    {
      number: 'Phase 1',
      title: 'Project Foundation',
      desc: 'Express + Vite + TypeScript + Tailwind + Security middlewares & Health check',
      status: 'active',
      icon: Layers,
    },
    {
      number: 'Phase 2',
      title: 'Supabase PostgreSQL + Prisma',
      desc: '7 core models, migrations, connection pooling, and health diagnostics',
      status: 'active',
      icon: Database,
    },
    {
      number: 'Phase 3',
      title: 'Secure Authentication',
      desc: 'Signup, Login, HttpOnly cookies, session management & auth guards',
      status: 'pending',
      icon: Lock,
    },
    {
      number: 'Phase 4',
      title: 'Brevo Email & Password Recovery',
      desc: '6-digit cryptographically hashed OTP, expiration, rate limiting',
      status: 'pending',
      icon: Mail,
    },
    {
      number: 'Phase 5',
      title: 'Drive Dashboard Layout',
      desc: 'Sidebar navigation, breadcrumbs, storage usage indicator & responsive shell',
      status: 'pending',
      icon: HardDrive,
    },
    {
      number: 'Phase 6',
      title: 'Cloudflare R2 Direct Uploads',
      desc: 'Private R2 bucket, presigned S3 URLs, zero-proxy backend streaming',
      status: 'pending',
      icon: UploadCloud,
    },
  ];

  const corePillars = [
    {
      title: 'Private Cloudflare R2',
      desc: 'Direct browser-to-R2 presigned PUT/GET uploads. Node backend never proxies large binaries.',
      icon: HardDrive,
    },
    {
      title: 'Supabase PostgreSQL',
      desc: 'Structured metadata, folder hierarchies, notes, users and OTP records via Prisma.',
      icon: Database,
    },
    {
      title: 'Full Class Notes Suite',
      desc: 'Rich Markdown & text editor with debounced autosave, pinned notes, and instant search.',
      icon: FileText,
    },
    {
      title: 'Strict Security by Default',
      desc: 'HttpOnly SameSite cookies, Helmet headers, rate limiting, and Zod runtime schema validation.',
      icon: Shield,
    },
  ];

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-8 sm:p-12 shadow-2xl border border-indigo-500/20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold backdrop-blur-md">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Phase 1 Foundation Operational
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Personal Cloud Storage &amp; Class Notes Web App
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl">
            Welcome to <span className="text-white font-semibold">Dulal Mahato Hub</span>. Built specifically for students to organize lecture notes, slide decks, PDFs, project folders, code archives, and assignments with high speed and zero bloat.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => refetch()}
              variant="primary"
              size="lg"
              className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
              isLoading={isFetching}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Backend Connection
            </Button>
            <a
              href="#health-card"
              className="inline-flex items-center justify-center font-medium text-sm px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors backdrop-blur-sm"
            >
              View System Diagnostics
            </a>
          </div>
        </div>
      </section>

      {/* Backend Health & Connectivity Card */}
      <section id="health-card" className="scroll-mt-20">
        <Card className="border-indigo-100 dark:border-indigo-950 shadow-md">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle>System &amp; Database Health Diagnostics</CardTitle>
                {isLoading ? (
                  <Badge variant="outline">Connecting...</Badge>
                ) : isError ? (
                  <Badge variant="danger">Backend Offline</Badge>
                ) : health?.database?.status === 'connected' ? (
                  <Badge variant="success">API &amp; DB Connected</Badge>
                ) : (
                  <Badge variant="success">API Healthy</Badge>
                )}
              </div>
              <CardDescription className="mt-1">
                Live communication between Vite frontend, Express API, and Supabase PostgreSQL via <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">/api/v1/health</code>
              </CardDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              isLoading={isFetching}
              className="self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
          </CardHeader>

          <CardContent className="pt-6">
            {isLoading ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-500 mb-3" />
                <p className="text-sm font-medium">Checking connection to Express API &amp; Supabase...</p>
              </div>
            ) : isError ? (
              <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 space-y-3">
                <div className="font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Could not connect to backend server
                </div>
                <p className="text-sm text-rose-700 dark:text-rose-300">
                  Ensure the backend is running using <code className="font-mono bg-rose-100 dark:bg-rose-900 px-1 py-0.5 rounded">npm run dev:backend</code> on port 5001.
                </p>
                <p className="text-xs font-mono text-rose-600 dark:text-rose-400">
                  {error instanceof Error ? error.message : 'Network request failed'}
                </p>
              </div>
            ) : health ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-xs text-slate-500 font-medium">API Server</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    {health.status.toUpperCase()}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">Service: {health.service}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-xs text-slate-500 font-medium">Supabase DB</div>
                  <div className={`text-xl font-bold mt-1 flex items-center gap-2 ${
                    health.database?.status === 'connected'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : health.database?.status === 'not_configured'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    <Database className="w-5 h-5" />
                    {health.database?.status === 'connected'
                      ? 'CONNECTED'
                      : health.database?.status === 'not_configured'
                      ? 'UNCONFIGURED'
                      : 'OFFLINE'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono truncate" title={health.database?.message}>
                    {health.database?.latencyMs !== undefined
                      ? `Ping: ${health.database.latencyMs}ms`
                      : health.database?.status === 'not_configured'
                      ? 'Set DATABASE_URL in .env'
                      : health.database?.message || 'Prisma ORM'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-xs text-slate-500 font-medium">Environment</div>
                  <div className="text-xl font-bold text-slate-800 dark:text-white mt-1 capitalize">
                    {health.environment}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">Node: {health.system.nodeVersion}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-xs text-slate-500 font-medium">Uptime</div>
                  <div className="text-xl font-bold text-slate-800 dark:text-white mt-1">
                    {health.uptime.seconds}s
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">{health.uptime.formatted}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-xs text-slate-500 font-medium">Memory (Heap)</div>
                  <div className="text-xl font-bold text-slate-800 dark:text-white mt-1">
                    {health.system.memoryUsageMB.heapUsed} MB
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">RSS: {health.system.memoryUsageMB.rss} MB</div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      {/* Core Architecture Pillars */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Architecture Highlights
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Built strictly according to enterprise specifications and private cloud guidelines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {corePillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Card key={pillar.title} className="hover:border-indigo-400/50 transition-colors">
                <CardHeader>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base">{pillar.title}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed mt-2">
                    {pillar.desc}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Roadmap & Phases Tracker */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Development Phases Tracker
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Strict phase-by-phase execution without fake buttons or mock APIs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {phases.map((phase) => {
            const Icon = phase.icon;
            const isActive = phase.status === 'active';
            return (
              <div
                key={phase.number}
                className={`p-5 rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-400 dark:border-indigo-600 shadow-sm ring-1 ring-indigo-500/20'
                    : 'bg-card border-slate-200/80 dark:border-slate-800/80 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono">
                    {phase.number}
                  </span>
                  {isActive ? (
                    <Badge variant="success" className="text-[10px]">Active / Complete</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Queued</Badge>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl mt-0.5 ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {phase.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {phase.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
