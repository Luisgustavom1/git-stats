package gitstats

import (
	"errors"
	"fmt"
	"math"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/go-git/go-git/v6"
	"github.com/go-git/go-git/v6/plumbing/object"
	"github.com/go-git/go-git/v6/plumbing/storer"
)

const defaultWeeks = 6
const defaultRecentLimit = 4

var ErrEmailNotConfigured = errors.New("email não configurado")
var ErrNoRepositoriesConfigured = errors.New("nenhum repositório configurado")
var ErrNoValidRepositories = errors.New("nenhum repositório válido encontrado")

type WeeklyCommit struct {
	Week    string `json:"week"`
	Commits int    `json:"commits"`
}

type RecentCommit struct {
	Repo    string `json:"repo"`
	Author  string `json:"author"`
	Message string `json:"message"`
	Date    string `json:"date"`
}

type DashboardMetrics struct {
	TotalCommits int `json:"totalCommits"`
	ActiveRepos  int `json:"activeRepos"`
	AvgPerWeek   int `json:"avgPerWeek"`
}

type DashboardSnapshot struct {
	Metrics       DashboardMetrics `json:"metrics"`
	WeeklyCommits []WeeklyCommit   `json:"weeklyCommits"`
	RecentCommits []RecentCommit   `json:"recentCommits"`
	WindowDays    int              `json:"windowDays"`
}

type repoSnapshot struct {
	weekCounts      []int
	recentCommits   []RecentCommit
	windowHasCommit bool
}

func Stats(email string) {
	snapshot, err := BuildDashboardSnapshot(email, defaultWeeks, defaultRecentLimit)
	if err != nil {
		fmt.Printf("Erro ao calcular estatísticas: %v\n", err)
		return
	}

	fmt.Printf("Total de commits: %d\n", snapshot.Metrics.TotalCommits)
	fmt.Printf("Repositórios ativos: %d\n", snapshot.Metrics.ActiveRepos)
	fmt.Printf("Média semanal: %d\n", snapshot.Metrics.AvgPerWeek)
}

func BuildDashboardSnapshot(email string, weeks int, recentLimit int) (DashboardSnapshot, error) {
	email = strings.TrimSpace(email)
	if email == "" {
		return DashboardSnapshot{}, ErrEmailNotConfigured
	}

	if weeks <= 0 {
		weeks = defaultWeeks
	}

	if recentLimit <= 0 {
		recentLimit = defaultRecentLimit
	}

	repos := parseFileLinesToSlice(getDotFilePath())
	if len(repos) == 0 {
		return DashboardSnapshot{}, ErrNoRepositoriesConfigured
	}

	now := time.Now()
	windowDays := weeks * 7
	windowStart := getBeginningOfDay(now).AddDate(0, 0, -(windowDays - 1))

	totalWeekCounts := make([]int, weeks)
	recentCommits := make([]RecentCommit, 0, recentLimit)
	activeRepos := make(map[string]struct{})
	validRepos := 0

	for _, path := range repos {
		result, err := collectRepoSnapshot(path, email, windowStart, now, weeks)
		if err != nil {
			continue
		}

		validRepos++
		for i, count := range result.weekCounts {
			totalWeekCounts[i] += count
		}

		if result.windowHasCommit {
			activeRepos[path] = struct{}{}
		}

		recentCommits = append(recentCommits, result.recentCommits...)
	}

	if validRepos == 0 {
		return DashboardSnapshot{}, ErrNoValidRepositories
	}

	if len(recentCommits) > 0 {
		sort.Slice(recentCommits, func(i, j int) bool {
			return recentCommits[i].Date > recentCommits[j].Date
		})
		if len(recentCommits) > recentLimit {
			recentCommits = recentCommits[:recentLimit]
		}
	}

	totalCommits := 0
	for _, count := range totalWeekCounts {
		totalCommits += count
	}

	return DashboardSnapshot{
		Metrics: DashboardMetrics{
			TotalCommits: totalCommits,
			ActiveRepos:  len(activeRepos),
			AvgPerWeek:   int(math.Round(float64(totalCommits) / float64(weeks))),
		},
		WeeklyCommits: toWeeklyCommits(totalWeekCounts),
		RecentCommits: recentCommits,
		WindowDays:    windowDays,
	}, nil
}

func collectRepoSnapshot(path string, email string, windowStart time.Time, now time.Time, weeks int) (repoSnapshot, error) {
	repo, err := git.PlainOpen(path)
	if err != nil {
		return repoSnapshot{}, err
	}

	ref, err := repo.Head()
	if err != nil {
		return repoSnapshot{}, err
	}

	iterator, err := repo.Log(&git.LogOptions{From: ref.Hash()})
	if err != nil {
		return repoSnapshot{}, err
	}

	windowDays := weeks * 7
	weekCounts := make([]int, weeks)
	recentCommits := make([]RecentCommit, 0, defaultRecentLimit)
	windowHasCommit := false

	err = iterator.ForEach(func(c *object.Commit) error {
		if c.Author.Email != email {
			return nil
		}

		commitDay := getBeginningOfDay(c.Author.When)
		if commitDay.Before(windowStart) {
			return storer.ErrStop
		}

		if commitDay.After(now) {
			return nil
		}

		daysFromStart := int(commitDay.Sub(windowStart).Hours() / 24)
		if daysFromStart < 0 || daysFromStart >= windowDays {
			return nil
		}

		weekIndex := daysFromStart / 7
		weekCounts[weekIndex]++
		windowHasCommit = true

		recentCommits = append(recentCommits, RecentCommit{
			Repo:    filepath.Base(path),
			Author:  c.Author.Name,
			Message: strings.TrimSpace(c.Message),
			Date:    c.Author.When.UTC().Format(time.RFC3339),
		})

		return nil
	})

	if err != nil && !errors.Is(err, storer.ErrStop) {
		return repoSnapshot{}, err
	}

	return repoSnapshot{
		weekCounts:      weekCounts,
		recentCommits:   recentCommits,
		windowHasCommit: windowHasCommit,
	}, nil
}

func toWeeklyCommits(weekCounts []int) []WeeklyCommit {
	weekly := make([]WeeklyCommit, 0, len(weekCounts))
	for i, count := range weekCounts {
		weekly = append(weekly, WeeklyCommit{
			Week:    fmt.Sprintf("Sem %d", i+1),
			Commits: count,
		})
	}
	return weekly
}

func getBeginningOfDay(t time.Time) time.Time {
	year, month, day := t.Date()
	return time.Date(year, month, day, 0, 0, 0, 0, t.Location())
}
