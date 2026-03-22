package gitstats

import (
	"errors"
	"math"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/go-git/go-git/v6"
	"github.com/go-git/go-git/v6/plumbing/object"
	"github.com/go-git/go-git/v6/plumbing/storer"
)

const defaultWeeks = 26
const defaultRecentLimit = 20

var ErrEmailNotConfigured = errors.New("email não configurado")
var ErrNoRepositoriesConfigured = errors.New("nenhum repositório configurado")
var ErrNoValidRepositories = errors.New("nenhum repositório válido encontrado")

type DailyCommit struct {
	Date    string `json:"date"`
	Commits int    `json:"commits"`
}

type RecentCommit struct {
	Repo    string `json:"repo"`
	Author  string `json:"author"`
	Message string `json:"message"`
	Date    string `json:"date"`
}

type DashboardSnapshot struct {
	DailyCommits  []DailyCommit  `json:"dailyCommits"`
	RecentCommits []RecentCommit `json:"recentCommits"`
	WindowDays    int            `json:"windowDays"`
}

type repoSnapshot struct {
	dayCounts     []int
	recentCommits []RecentCommit
}

func BuildDashboardSnapshot(email string, weeks int, recentLimit int) (DashboardSnapshot, error) {
	email = strings.TrimSpace(email)
	if email == "" {
		return DashboardSnapshot{}, ErrEmailNotConfigured
	}

	repos := parseFileLinesToSlice(getDotFilePath())
	if len(repos) == 0 {
		return DashboardSnapshot{}, ErrNoRepositoriesConfigured
	}

	now := time.Now()
	windowDays := weeks * 7
	windowStart := getBeginningOfDay(now).AddDate(0, 0, -(windowDays - 1))

	totalDayCounts := make([]int, windowDays)
	recentCommits := make([]RecentCommit, 0, recentLimit)
	validRepos := 0

	for _, path := range repos {
		result, err := collectRepoSnapshot(path, email, windowStart, now, windowDays)
		if err != nil {
			continue
		}

		validRepos++
		for i, count := range result.dayCounts {
			totalDayCounts[i] += count
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

	return DashboardSnapshot{
		DailyCommits:  toDailyCommits(totalDayCounts, windowStart),
		RecentCommits: recentCommits,
		WindowDays:    windowDays,
	}, nil
}

func collectRepoSnapshot(path string, email string, windowStart time.Time, now time.Time, windowDays int) (repoSnapshot, error) {
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

	dayCounts := make([]int, windowDays)
	recentCommits := make([]RecentCommit, 0, defaultRecentLimit)

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

		dayCounts[daysFromStart]++

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
		dayCounts:     dayCounts,
		recentCommits: recentCommits,
	}, nil
}

func toDailyCommits(dayCounts []int, windowStart time.Time) []DailyCommit {
	daily := make([]DailyCommit, 0, len(dayCounts))
	for i, count := range dayCounts {
		dayDate := windowStart.AddDate(0, 0, i)
		daily = append(daily, DailyCommit{
			Date:    dayDate.Format("2006-01-02"),
			Commits: count,
		})
	}
	return daily
}

func deriveMetricsFromDailyCommits(dailyCommits []DailyCommit, windowDays int) (int, int) {
	totalCommits := 0
	for _, item := range dailyCommits {
		totalCommits += item.Commits
	}

	avgPerWeek := 0
	if windowDays > 0 {
		avgPerWeek = int(math.Round(float64(totalCommits*7) / float64(windowDays)))
	}

	return totalCommits, avgPerWeek
}

func getBeginningOfDay(t time.Time) time.Time {
	year, month, day := t.Date()
	return time.Date(year, month, day, 0, 0, 0, 0, t.Location())
}
