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

func scan(folder string) {
	fmt.Println("Scanning ", folder)
	repos := recursiveScanFolder(folder)
	filePath := getDotFilePath()
	addNewRepos(filePath, repos)
	fmt.Println("\nSuccesfully added\n")
}

func getDotFilePath() string {
	usr, err := user.Current()
	if err != nil {
		log.Fatal(err)
	}
	dotFile := usr.HomeDir + "/.gitstats"
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
			if file.Name() == ".git" {
				path = strings.TrimSuffix(path, "/.git")
				fmt.Println(path)
				folders = append(folders, path)
				continue
			}

			if file.Name() == "vendor" || file.Name() == "node_modules" || file.Name() == "build" {
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

func addNewRepos(filePath string, newRepos []string) {
	existingRepos := parseFileLinesToSlice(filePath)
	repos := joinSlices(newRepos, existingRepos)
	dumpStringsSliceToFile(filePath, repos)
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
	f, err := os.OpenFile(filePath, os.O_APPEND|os.O_WRONLY, 0755)
	if err != nil {
		if os.IsNotExist(err) {
			_, err = os.Create(filePath)
			if err != nil {
				panic(err)
			}
		} else {
			panic(err)
		}
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
