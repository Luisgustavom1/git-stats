import {useEffect, useMemo, useState} from 'react'
import {GetDashboardSnapshot} from '../wailsjs/go/app/App'
import type {gitstats} from '../wailsjs/go/models'
import {GitCommitHorizontal, History} from 'lucide-react'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

function formatMonthLabel(date: Date): string {
    const value = new Intl.DateTimeFormat('pt-BR', {month: 'short'}).format(date).replace('.', '')
    return value.charAt(0).toUpperCase() + value.slice(1)
}

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

function aggregateDailyToWeekly(dayValues: number[]): number[] {
    if (dayValues.length === 0) {
        return [0]
    }

    const weekCount = Math.ceil(dayValues.length / 7)
    const weekly = Array.from({length: weekCount}, () => 0)

    dayValues.forEach((value, dayIndex) => {
        const weekIndex = Math.floor(dayIndex / 7)
        weekly[weekIndex] += value
    })

    return weekly
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

    const dailyValues = useMemo(() => {
        const fallbackDays = snapshot?.windowDays ?? 182
        if (!snapshot?.dailyCommits?.length) {
            return Array.from({length: fallbackDays}, () => 0)
        }
        return snapshot.dailyCommits.map((item) => item.commits)
    }, [snapshot])

    const weeklyValues = useMemo(() => aggregateDailyToWeekly(dailyValues), [dailyValues])

    const areaPath = useMemo(() => buildAreaPath(weeklyValues), [weeklyValues])

    const heatmap = useMemo(() => {
        const maxDayCommits = Math.max(...dailyValues, 1)
        return dailyValues.map((value) => Math.min(Math.floor((value / maxDayCommits) * 4), 4))
    }, [dailyValues])

    const heatmapMonthLabels = useMemo(() => {
        const months = 6
        const now = new Date()

        return Array.from({length: months}, (_, index) => {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1)
            return formatMonthLabel(monthDate)
        })
    }, [])

    const totalCommits = useMemo(
        () => dailyValues.reduce((accumulator, value) => accumulator + value, 0),
        [dailyValues]
    )
    const avgPerWeek = useMemo(() => {
        const windowDays = snapshot?.windowDays ?? dailyValues.length
        if (windowDays <= 0) {
            return 0
        }
        return Math.round((totalCommits * 7) / windowDays)
    }, [dailyValues.length, snapshot?.windowDays, totalCommits])
    const maxWeeklyCommits = Math.max(...weeklyValues, 0)

    return (
        <div className="h-screen overflow-hidden bg-surface text-foreground">
            <main className="mx-auto h-full w-full space-y-2 overflow-y-auto px-2 py-2">
                <section className="space-y-1.5">
                    <div className="flex items-end justify-between">
                        <h2 className="text-sm font-bold tracking-tight text-foreground">Commit Activity</h2>
                        <div className="text-right flex gap-1 items-center">
                            <p className="text-[0.55rem] uppercase tracking-wider text-muted-foreground">média</p>
                            <span className="text-xs font-bold text-primary">{avgPerWeek}/sem</span>
                        </div>
                    </div>

                    <div className="relative h-24 overflow-hidden rounded-lg bg-surface-low p-2">
                        <div className="absolute inset-0 flex flex-col justify-between p-2 opacity-10">
                            <div className="border-b border-foreground"/>
                            <div className="border-b border-foreground"/>
                            <div className="border-b border-foreground"/>
                            <div className="border-b border-foreground"/>
                        </div>

                        <svg className="absolute inset-0 h-full w-full px-2 pb-2 pt-4" preserveAspectRatio="none" viewBox="0 0 100 100">
                            <defs>
                                <linearGradient id="commitFill" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.45"/>
                                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0"/>
                                </linearGradient>
                            </defs>
                            <path d={areaPath} fill="url(#commitFill)"/>
                        </svg>

                        <div className="absolute left-2 top-1.5 flex items-center gap-1 text-[8px] font-semibold text-muted-foreground">
                            <span className="inline-block h-[1px] w-3 rounded-full bg-primary"/>
                            <span>Série semanal</span>
                        </div>

                        <div className="absolute right-2 top-1.5 text-[8px] font-semibold text-muted-foreground">
                            Máx: {maxWeeklyCommits}
                        </div>

                        <div className="absolute bottom-1.5 left-2 right-2 flex justify-between text-[0.5rem] font-bold uppercase tracking-widest text-muted-foreground">
                            <span>6 meses</span>
                            <span>Hoje</span>
                        </div>
                    </div>
                </section>

                <section className="overflow-hidden rounded-lg border border-white/5 bg-surface-low p-2">
                    <div className="mb-2 flex items-center justify-between gap-1">
                        <h3 className="text-[10px] font-bold text-foreground">Contribuições</h3>
                        <div className="flex items-center gap-1 text-[8px] uppercase tracking-wider text-muted-foreground">
                            <span>Menos</span>
                            <div className="h-1.5 w-1.5 rounded-[2px] bg-surface-highest"/>
                            <div className="h-1.5 w-1.5 rounded-[2px] bg-primary/30"/>
                            <div className="h-1.5 w-1.5 rounded-[2px] bg-primary/60"/>
                            <div className="h-1.5 w-1.5 rounded-[2px] bg-primary/80"/>
                            <div className="h-1.5 w-1.5 rounded-[2px] bg-primary"/>
                            <span>Mais</span>
                        </div>
                    </div>

                    <div className="hide-scrollbar overflow-x-auto">
                        <div className="inline-grid min-w-full grid-flow-col grid-rows-7 gap-1">
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

                                return <div key={index} className={`h-1.5 w-1.5 rounded-[1px] ${levelClass}`}/>
                            })}
                        </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="text-[8px] text-muted-foreground">
                            <span className="font-bold text-foreground">Total: {totalCommits}</span> commits
                        </div>
                        <div className="flex flex-wrap justify-end gap-1.5 text-[8px] font-bold uppercase text-muted-foreground">
                            {heatmapMonthLabels.map((month) => (
                                <span key={month}>{month}</span>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold tracking-tight text-foreground">Recent Activity</h3>
                    </div>

                    <div className="space-y-1">
                        {state === 'loading' && (
                            <div className="rounded-lg bg-surface-low p-2 text-[10px] text-muted-foreground">Carregando atividade…</div>
                        )}

                        {state === 'error' && (
                            <div className="rounded-lg bg-surface-low p-2 text-[10px] text-red-300">{error}</div>
                        )}

                        {state === 'ready' && snapshot?.recentCommits.length === 0 && (
                            <div className="rounded-lg bg-surface-low p-2 text-[10px] text-muted-foreground">Nenhum commit recente encontrado.</div>
                        )}

                        {snapshot?.recentCommits.map((commit, index) => (
                            <div key={`${commit.repo}-${commit.date}-${index}`} className="flex items-start gap-2 rounded-lg p-2 transition-colors hover:bg-surface-high">
                                <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-surface-highest text-muted-foreground">
                                    {index === 0 ? <GitCommitHorizontal size={12} className="text-primary"/> : <History size={12}/>} 
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <h4 className="truncate text-[10px] font-bold text-foreground">{commit.repo}</h4>
                                        <span className="flex-shrink-0 text-[8px] text-muted-foreground">{formatRelativeDate(commit.date)}</span>
                                    </div>
                                    <p className="mt-0.5 truncate text-[9px] italic text-muted-foreground">“{commit.message}”</p>
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
