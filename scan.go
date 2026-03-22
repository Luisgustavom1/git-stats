package main

import (
	"bufio"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"os/user"
	"strings"
)

var ignoredDirectories = map[string]struct{}{
	"vendor":       {},
	"node_modules": {},
	"build":        {},
	"dist":         {},
	"target":       {},
	"bin":          {},
	"obj":          {},
	"out":          {},
	"coverage":     {},
	".next":        {},
	".nuxt":        {},
	".cache":       {},
	".turbo":       {},
	".yarn":        {},
	".pnpm-store":  {},
	"__pycache__":  {},
	"venv":         {},
	".venv":        {},
	".gradle":      {},
}

func shouldSkipDirectory(name string) bool {
	_, skip := ignoredDirectories[name]
	return skip
}

func scan(folder string) {
	fmt.Println("Scanning ", folder)
	repos := recursiveScanFolder(folder)
	gitStatsDotFile := getDotFilePath()
	addNewRepos(gitStatsDotFile, repos)
	fmt.Println("\nSuccesfully added\n")
}

func getDotFilePath() string {
	_, err := user.Current()
	if err != nil {
		log.Fatal(err)
	}
	// dotFile := usr.HomeDir + "/.gitstats"
	dotFile := ".gitstats"
	return dotFile
}

func scanGitFolders(folders []string, folder string) []string {
	folder = strings.TrimSuffix(folder, "/")
	f, err := os.Open(folder)
	if err != nil {
		log.Fatal(err)
	}
	files, err := f.Readdir(-1)
	f.Close()
	if err != nil {
		log.Fatal(err)
	}
	var path string
	for _, file := range files {
		if file.IsDir() {
			path = folder + "/" + file.Name()

			if shouldSkipDirectory(file.Name()) {
				continue
			}

			if file.Name() == ".git" {
				path = strings.TrimSuffix(path, "/.git")
				fmt.Println(path)
				folders = append(folders, path)
				continue
			}

			folders = scanGitFolders(folders, path)
		}
	}
	return folders
}

func recursiveScanFolder(folder string) []string {
	return scanGitFolders(make([]string, 0), folder)
}

func addNewRepos(targetPath string, newRepos []string) {
	existingRepos := parseFileLinesToSlice(targetPath)
	repos := joinSlices(newRepos, existingRepos)
	dumpStringsSliceToFile(repos, targetPath)
}

func joinSlices(new []string, existing []string) []string {
	existingMap := make(map[string]bool)
	for _, i := range existing {
		existingMap[i] = true
	}

	for _, i := range new {
		if !existingMap[i] {
			existing = append(existing, i)
		}
	}
	return existing
}

func dumpStringsSliceToFile(repos []string, filePath string) {
	content := strings.Join(repos, "\n")
	os.WriteFile(filePath, []byte(content), 0755)
}

func parseFileLinesToSlice(filePath string) []string {
	f := openFile(filePath)
	defer f.Close()
	var lines []string
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}
	if err := scanner.Err(); err != nil {
		if err != io.EOF {
			panic(err)
		}
	}
	return lines
}

func openFile(filePath string) *os.File {
	f, err := os.OpenFile(filePath, os.O_RDWR|os.O_CREATE, 0644)
	if err != nil {
		panic(err)
	}
	return f
}

func stats(email string) {
	fmt.Println("stats", email)
}

func main() {
	var folder string
	var email string

	flag.StringVar(&folder, "add", "", "add a new folder to scan for Git repositories")
	flag.StringVar(&email, "email", "your@email.com", "the email to scan")
	flag.Parse()

	if folder != "" {
		scan(folder)
		return
	}

	stats(email)
}
