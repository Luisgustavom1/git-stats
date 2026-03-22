import {useEffect, useMemo, useState} from 'react';
import {Activity, FolderGit2, GitCommitHorizontal, RefreshCw} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {GetDashboardSnapshot} from '../wailsjs/go/app/App';
 
type WeeklyCommit = {
    week: string;
    commits: number;
};

type RecentCommit = {
    repo: string;
    author: string;
    message: string;
    date: string;
};

type DashboardMetrics = {
    totalCommits: number;
    activeRepos: number;
    avgPerWeek: number;
};

type DashboardSnapshot = {
    metrics: DashboardMetrics;
    weeklyCommits: WeeklyCommit[];
    recentCommits: RecentCommit[];
    windowDays: number;
};

const EMPTY_METRICS: DashboardMetrics = {
    totalCommits: 0,
    activeRepos: 0,
    avgPerWeek: 0
};

const EMPTY_WEEKLY_COMMITS: WeeklyCommit[] = [
    {week: 'Sem 1', commits: 0},
    {week: 'Sem 2', commits: 0},
    {week: 'Sem 3', commits: 0},
    {week: 'Sem 4', commits: 0},
    {week: 'Sem 5', commits: 0},
    {week: 'Sem 6', commits: 0}
];

function asErrorMessage(value: unknown): string {
    if (value instanceof Error && value.message) {
        return value.message;
    }

    if (typeof value === 'string' && value.length > 0) {
        return value;
    }

    return 'Não foi possível carregar as estatísticas agora. Tente novamente.';
}

function formatCommitDate(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
    }).format(parsed);
}

function App() {
    const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadSnapshot = async (mode: 'initial' | 'refresh') => {
        if (mode === 'refresh' && (isRefreshing || isLoading)) {
            return;
        }

        if (mode === 'initial') {
            setIsLoading(true);
        } else {
            setIsRefreshing(true);
        }

        setError(null);

        try {
            const nextSnapshot = await GetDashboardSnapshot();
            setSnapshot(nextSnapshot);
        } catch (loadError) {
            setError(asErrorMessage(loadError));
            if (mode === 'initial') {
                setSnapshot(null);
            }
        } finally {
            if (mode === 'initial') {
                setIsLoading(false);
            } else {
                setIsRefreshing(false);
            }
        }
    };

    useEffect(() => {
        void loadSnapshot('initial');
    }, []);

    const weeklyCommits = snapshot?.weeklyCommits?.length ? snapshot.weeklyCommits : EMPTY_WEEKLY_COMMITS;
    const metrics = snapshot?.metrics ?? EMPTY_METRICS;
    const recentCommits = snapshot?.recentCommits ?? [];
    const windowDays = snapshot?.windowDays ?? 42;
    const isEmpty = !isLoading && !error && metrics.totalCommits === 0;

    const maxCommits = useMemo(
        () => Math.max(...weeklyCommits.map((item) => item.commits), 1),
        [weeklyCommits]
    );

    return (
        <main className="mx-auto grid max-w-7xl gap-5 px-3 py-4 md:px-4 md:py-5">
            <section className="grid gap-4 rounded-3xl bg-surface-variant/40 p-4 shadow-ambient backdrop-blur-xl md:p-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3 text-left">
                    <header className='flex items-center justify-between'>
                        <Badge variant="green" className="w-fit">Visão Editorial</Badge>

                        <Button
                            variant="secondary"
                            size="sm"
                            aria-label="Atualizar snapshot"
                            title="Atualizar snapshot"
                            className="h-8 w-8 rounded-full p-0 opacity-80 hover:opacity-100"
                            onClick={() => void loadSnapshot('refresh')}
                            disabled={isLoading || isRefreshing}
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}/>
                        </Button>
                    </header>
                    <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-foreground md:text-4xl">
                        Estatísticas de commits locais
                    </h1>
                    <p className="max-w-xl text-sm text-muted-foreground">
                        Um panorama dos seus últimos commits com foco em ritmo, impacto e consistência entre repositórios.
                    </p>
                    <Badge className="bg-secondary text-secondary-foreground">últimos {windowDays} dias</Badge>
                </div>

                <Card className="relative bg-gradient-to-br from-[#7bdb80] to-[#238636] text-[#08120b]">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs uppercase tracking-[0.05em] text-[#122718]/80">Impacto total</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 p-4 pt-0">
                        <p className="text-5xl font-extrabold tracking-[-0.02em]">{isLoading ? '…' : metrics.totalCommits}</p>
                        <p className="text-xs font-medium text-[#122718]/85">
                            {error ? 'falha ao carregar o período' : 'commits no período selecionado'}
                        </p>
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-3 md:grid-cols-3" aria-label="Estatísticas gerais">
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.05em] text-muted-foreground">
                            <GitCommitHorizontal className="h-4 w-4 text-primary"/> Total de commits
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-3xl font-extrabold tracking-[-0.02em]">{isLoading ? '…' : metrics.totalCommits}</p>
                    </CardContent>
                </Card>

                <Card className="bg-surface-low">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.05em] text-muted-foreground">
                            <FolderGit2 className="h-4 w-4 text-primary"/> Repositórios ativos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-3xl font-extrabold tracking-[-0.02em]">{isLoading ? '…' : metrics.activeRepos}</p>
                    </CardContent>
                </Card>

                <Card className="bg-surface-highest">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.05em] text-muted-foreground">
                            <Activity className="h-4 w-4 text-primary"/> Média semanal
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-3xl font-extrabold tracking-[-0.02em]">{isLoading ? '…' : metrics.avgPerWeek}</p>
                    </CardContent>
                </Card>
            </section>


            <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <Card className="bg-surface-high">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-lg">Commits por semana</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="grid h-[260px] grid-cols-6 items-end gap-2" role="img" aria-label="Gráfico de barras com commits semanais">
                            {weeklyCommits.map((item) => {
                                const barHeight = `${(item.commits / maxCommits) * 100}%`;
                                const intensityClass = item.commits > 25
                                    ? 'from-[#7bdb80] to-[#56c05f]'
                                    : item.commits > 18
                                        ? 'from-[#5aaa60] to-[#3e8f46]'
                                        : 'from-[#238636] to-[#1f6e32]';

                                return (
                                    <div key={item.week} className="grid h-full grid-rows-[1fr_auto_auto] items-end gap-2">
                                        <div className="h-full rounded-md bg-surface-highest p-1">
                                            <div
                                                className={`w-full rounded-md bg-gradient-to-t ${intensityClass}`}
                                                style={{height: barHeight}}
                                                title={`${item.commits} commits`}
                                            />
                                        </div>
                                        <span className="text-center text-xs text-foreground">{item.commits}</span>
                                        <span className="text-center text-[0.68rem] uppercase tracking-[0.05em] text-muted-foreground">{item.week}</span>
                                    </div>
                                );
                            })}
                        </div>
                        {error ? (
                            <p className="mt-3 text-sm text-muted-foreground">{error}</p>
                        ) : null}
                        {isEmpty ? (
                            <p className="mt-3 text-sm text-muted-foreground">Sem commits no período selecionado.</p>
                        ) : null}
                    </CardContent>
                </Card>

                <Card className="bg-surface-low">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-lg">Últimos commits</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        {error ? (
                            <div className="space-y-3">
                                <p className="text-sm text-muted-foreground">{error}</p>
                                <Button variant="secondary" size="sm" onClick={() => void loadSnapshot('initial')}>
                                    Tentar novamente
                                </Button>
                            </div>
                        ) : null}

                        {!error && recentCommits.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {isLoading ? 'Carregando commits recentes...' : 'Nenhum commit recente encontrado.'}
                            </p>
                        ) : null}

                        {!error && recentCommits.length > 0 ? (
                            <ul className="space-y-2.5">
                                {recentCommits.map((commit) => (
                                <li
                                    key={`${commit.repo}-${commit.date}-${commit.message}`}
                                    className="rounded-md bg-surface-high p-2.5 transition-colors hover:bg-surface-bright flex justify-between items-end"
                                >
                                    <div>
                                        <p className="text-sm font-semibold">{commit.message}</p>
                                        <p className="mt-1 text-xs uppercase tracking-[0.05em] text-muted-foreground">
                                            {commit.repo} · {commit.author}
                                        </p>
                                    </div>
                                    <time className="mt-2 block text-xs font-bold text-muted-foreground">{formatCommitDate(commit.date)}</time>
                                </li>
                                ))}
                            </ul>
                        ) : null}
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}

export {App};
