package gitstats

import (
	"fmt"
	"sort"
	"time"

	"github.com/go-git/go-git/v6"
	"github.com/go-git/go-git/v6/plumbing/object"
)

const daysInLastSixMonths = 183
const outOfRange = -1
const weeksInLastSixMonths = 26

type column []int

func Stats(email string) {
	commitsPerDay := processRepositories(email)
	printCommits(commitsPerDay)
}

func processRepositories(email string) map[int]int {
	gitStatsDotFile := getDotFilePath()
	repos := parseFileLinesToSlice(gitStatsDotFile)
	daysInMap := daysInLastSixMonths
	commits := make(map[int]int, daysInMap)

	for i := daysInMap; i > 0; i-- {
		commits[i] = 0
	}
	for _, path := range repos {
		fillCommits(email, path, commits)
	}
	return commits
}

func fillCommits(email string, path string, commits map[int]int) {
	repo, err := git.PlainOpen(path)
	if err != nil {
		panic(err)
	}

	ref, err := repo.Head()
	if err != nil {
		panic(err)
	}

	iterator, err := repo.Log(&git.LogOptions{From: ref.Hash()})
	if err != nil {
		panic(err)
	}

	offset := calcOffset()
	err = iterator.ForEach(func(c *object.Commit) error {
		daysAgo := countDaysSinceDate(c.Author.When) + offset
		if c.Author.Email != email {
			return nil
		}

		if daysAgo != outOfRange {
			commits[daysAgo]++
		}

		return nil
	})

	if err != nil {
		panic(err)
	}
}

func countDaysSinceDate(date time.Time) int {
	days := 0
	now := getBeginningOfDay(time.Now())
	for date.Before(now) {
		date = date.Add(time.Hour * 24)
		days++
		if days > daysInLastSixMonths {
			return outOfRange
		}
	}
	return days
}

func getBeginningOfDay(t time.Time) time.Time {
	year, month, day := t.Date()
	startOfDay := time.Date(year, month, day, 0, 0, 0, 0, t.Location())
	return startOfDay
}

func printCommits(commitsPerDay map[int]int) {
	days := sortMapIntoSlice(commitsPerDay)
	cols := buildCols(days, commitsPerDay)
	printCells(cols)
}

func sortMapIntoSlice(m map[int]int) []int {
	var keys []int
	for k := range m {
		keys = append(keys, k)
	}
	sort.Ints(keys)

	return keys
}

func buildCols(days []int, commitsPerDay map[int]int) map[int]column {
	cols := make(map[int]column)
	col := column{}

	for _, k := range days {
		week := int(k / 7) //26,25...1
		dayInWeek := k % 7 // 0,1,2,3,4,5,6

		reset := dayInWeek == 0
		if reset {
			col = column{}
		}

		col = append(col, commitsPerDay[k])

		if dayInWeek == 6 {
			cols[week] = col
		}
	}

	return cols
}

func printCells(cols map[int]column) {
	printMonths()
	for j := 6; j >= 0; j-- {
		for i := weeksInLastSixMonths + 1; i >= 0; i-- {
			if i == weeksInLastSixMonths+1 {
				printDayCol(j)
			}
			if col, ok := cols[i]; ok {
				if i == 0 && j == calcOffset()-1 {
					printCell(col[j-1], true)
					continue
				} else {
					if len(col) > j {
						printCell(col[j], false)
						continue
					}
				}
			}
			printCell(0, false)
		}
		fmt.Printf("\n")
	}
}

func printMonths() {
	week := getBeginningOfDay(time.Now()).Add(-(daysInLastSixMonths * time.Hour * 24))
	month := week.Month()
	fmt.Printf("         ")
	for {
		if week.Month() != month {
			fmt.Printf("%s ", week.Month().String()[:3])
			month = week.Month()
		} else {
			fmt.Printf("    ")
		}

		week = week.Add(7 * time.Hour * 24)
		if week.After(time.Now()) {
			break
		}
	}
	fmt.Printf("\n")
}

func printCell(val int, today bool) {
	escape := "\033[38;5;250;48;5;236m"
	switch {
	case val > 0 && val < 5:
		escape = "\033[38;5;255;48;5;22m"
	case val >= 5 && val < 10:
		escape = "\033[38;5;255;48;5;28m"
	case val >= 10:
		escape = "\033[38;5;255;48;5;34m"
	}

	if today {
		escape = "\033[1;38;5;255;48;5;25m"
	}

	if val == 0 {
		fmt.Printf(escape + "  - " + "\033[0m")
		return
	}

	str := "  %d "
	switch {
	case val >= 10:
		str = " %d "
	case val >= 100:
		str = "%d "
	}

	fmt.Printf(escape+str+"\033[0m", val)
}

func printDayCol(day int) {
	out := "     "
	switch day {
	case 1:
		out = " Mon "
	case 3:
		out = " Wed "
	case 5:
		out = " Fri "
	}

	fmt.Printf(out)
}

func calcOffset() int {
	var offset int
	weekday := time.Now().Weekday()
	switch weekday {
	case time.Sunday:
		offset = 7
	case time.Monday:
		offset = 6
	case time.Tuesday:
		offset = 5
	case time.Wednesday:
		offset = 4
	case time.Thursday:
		offset = 3
	case time.Friday:
		offset = 2
	case time.Saturday:
		offset = 1
	}
	return offset
}
