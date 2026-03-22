import {useEffect, useMemo, useState} from 'react'
import {GetDashboardSnapshot} from '../wailsjs/go/app/App'
import type {gitstats} from '../wailsjs/go/models'
import {GitCommitHorizontal, History} from 'lucide-react'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatRelativeDate(isoDate: string): string {
    const now = Date.now()
    const timestamp = new Date(isoDate).getTime()
    const diffMs = Math.max(now - timestamp, 0)
    const diffMinutes = Math.floor(diffMs / 60000)

    if (diffMinutes < 1) {
        return 'agora'
    }
    if (diffMinutes < 60) {
        return `${diffMinutes}m atrás`
    }

    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) {
        return `${diffHours}h atrás`
    }

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d atrás`
}

function buildGraphPath(points: number[]): string {
    if (points.length === 0) {
        return ''
    }

    const maxValue = Math.max(...points, 1)
    const step = 100 / Math.max(points.length - 1, 1)

    return points
        .map((value, index) => {
            const x = index * step
            const y = 90 - (value / maxValue) * 70
            return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
        })
        .join(' ')
}

function buildAreaPath(points: number[]): string {
    if (points.length === 0) {
        return ''
    }

    const linePath = buildGraphPath(points)
    return `${linePath} L100,100 L0,100 Z`
}

function App() {
    const [state, setState] = useState<LoadState>('idle')
    const [error, setError] = useState('')
    const [snapshot, setSnapshot] = useState<gitstats.DashboardSnapshot | null>(null)

    useEffect(() => {
        let mounted = true

        const load = async () => {
            setState('loading')
            setError('')

            try {
                const data = await GetDashboardSnapshot()
                if (!mounted) {
                    return
                }
                setSnapshot(data)
                setState('ready')
            } catch (loadError) {
                if (!mounted) {
                    return
                }
                const message = loadError instanceof Error ? loadError.message : 'Erro ao carregar dados'
                setError(message)
                setState('error')
            }
        }

        void load()

        return () => {
            mounted = false
        }
    }, [])

    const weeklyValues = useMemo(() => {
        if (!snapshot?.weeklyCommits?.length) {
            return [0, 0, 0, 0, 0, 0, 0, 0]
        }
        return snapshot.weeklyCommits.map((item) => item.commits)
    }, [snapshot])

    const graphPath = useMemo(() => buildGraphPath(weeklyValues), [weeklyValues])
    const areaPath = useMemo(() => buildAreaPath(weeklyValues), [weeklyValues])

    const heatmap = useMemo(() => {
        if (!snapshot?.weeklyCommits?.length) {
            return Array.from({length: 52 * 7}, () => 0)
        }

        const maxWeekCommits = Math.max(...snapshot.weeklyCommits.map((item) => item.commits), 1)

        return Array.from({length: 52 * 7}, (_, index) => {
            const weekIndex = Math.floor(index / 7)
            const mappedWeek = Math.floor((weekIndex / 52) * snapshot.weeklyCommits.length)
            const value = snapshot.weeklyCommits[mappedWeek]?.commits ?? 0
            return Math.min(Math.floor((value / maxWeekCommits) * 4), 4)
        })
    }, [snapshot])

    const totalCommits = snapshot?.metrics.totalCommits ?? 0
    const avgPerWeek = snapshot?.metrics.avgPerWeek ?? 0

    return (
        <div className="min-h-screen bg-surface text-foreground pb-24">
            <main className="mx-auto max-w-2xl space-y-8 px-4 pt-6">
                <section className="space-y-4">
                    <div className="flex items-end justify-between">
                        <div>
                            <span className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground">Insights</span>
                            <h2 className="text-2xl font-bold tracking-tight text-foreground">Commit Activity</h2>
                        </div>
                        <div className="text-right">
                            <span className="text-lg font-bold text-primary">{avgPerWeek}/sem</span>
                            <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">média de commits</p>
                        </div>
                    </div>

                    <div className="relative h-64 overflow-hidden rounded-xl bg-surface-low p-6">
                        <div className="absolute inset-0 flex flex-col justify-between p-6 opacity-10">
                            <div className="border-b border-foreground"/>
                            <div className="border-b border-foreground"/>
                            <div className="border-b border-foreground"/>
                            <div className="border-b border-foreground"/>
                        </div>

                        <svg className="absolute inset-0 h-full w-full px-6 pb-6 pt-10" preserveAspectRatio="none" viewBox="0 0 100 100">
                            <defs>
                                <linearGradient id="commitFill" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.45"/>
                                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0"/>
                                </linearGradient>
                            </defs>
                            <path d={areaPath} fill="url(#commitFill)"/>
                            <path d={graphPath} fill="none" stroke="hsl(var(--primary))" strokeLinecap="round" strokeWidth="2"/>
                        </svg>

                        <div className="absolute bottom-4 left-6 right-6 flex justify-between text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
                            <span>{snapshot?.windowDays ?? 0} dias atrás</span>
                            <span>Hoje</span>
                        </div>
                    </div>
                </section>

                <section className="overflow-hidden rounded-xl border border-white/5 bg-surface-low p-4 sm:p-6">
                    <div className="mb-4 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-foreground">Contribuições no período</h3>
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            <span>Menos</span>
                            <div className="h-2.5 w-2.5 rounded-sm bg-surface-highest"/>
                            <div className="h-2.5 w-2.5 rounded-sm bg-primary/30"/>
                            <div className="h-2.5 w-2.5 rounded-sm bg-primary/60"/>
                            <div className="h-2.5 w-2.5 rounded-sm bg-primary/80"/>
                            <div className="h-2.5 w-2.5 rounded-sm bg-primary"/>
                            <span>Mais</span>
                        </div>
                    </div>

                    <div className="hide-scrollbar overflow-x-auto">
                        <div className="inline-grid min-w-full grid-flow-col grid-rows-7 gap-1.5">
                            {heatmap.map((level, index) => {
                                const levelClass =
                                    level <= 0
                                        ? 'bg-surface-highest'
                                        : level === 1
                                            ? 'bg-primary/20'
                                            : level === 2
                                                ? 'bg-primary/40'
                                                : level === 3
                                                    ? 'bg-primary/70'
                                                    : 'bg-primary'

                                return <div key={index} className={`h-2.5 w-2.5 rounded-[2px] ${levelClass}`}/>
                            })}
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4">
                        <div className="text-[10px] text-muted-foreground">
                            <span className="font-bold text-foreground">Total: {totalCommits}</span> commits
                        </div>
                        <div className="flex flex-wrap justify-end gap-2 text-[9px] font-bold uppercase text-muted-foreground">
                            {monthLabels.map((month) => (
                                <span key={month}>{month}</span>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold tracking-tight text-foreground">Recent Activity</h3>
                        <button className="text-[0.7rem] font-bold uppercase tracking-widest text-primary" type="button">
                            View History
                        </button>
                    </div>

                    <div className="space-y-2">
                        {state === 'loading' && (
                            <div className="rounded-xl bg-surface-low p-4 text-sm text-muted-foreground">Carregando atividade…</div>
                        )}

                        {state === 'error' && (
                            <div className="rounded-xl bg-surface-low p-4 text-sm text-red-300">{error}</div>
                        )}

                        {state === 'ready' && snapshot?.recentCommits.length === 0 && (
                            <div className="rounded-xl bg-surface-low p-4 text-sm text-muted-foreground">Nenhum commit recente encontrado.</div>
                        )}

                        {snapshot?.recentCommits.map((commit, index) => (
                            <div key={`${commit.repo}-${commit.date}-${index}`} className="flex items-start gap-4 rounded-xl p-4 transition-colors hover:bg-surface-high">
                                <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface-highest text-muted-foreground">
                                    {index === 0 ? <GitCommitHorizontal size={16} className="text-primary"/> : <History size={16}/>} 
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <h4 className="truncate text-sm font-bold text-foreground">{commit.repo}</h4>
                                        <span className="flex-shrink-0 text-[0.65rem] text-muted-foreground">{formatRelativeDate(commit.date)}</span>
                                    </div>
                                    <p className="mt-1 truncate text-xs italic text-muted-foreground">“{commit.message}”</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    )
}

export {App}
