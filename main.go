package main

import (
	"flag"

	"github.com/git-stats/internal/gitstats"
)

func main() {
	var folder string
	var email string

	flag.StringVar(&folder, "add", "", "add a new folder to scan for Git repositories")
	flag.StringVar(&email, "email", "myemail@example.com", "the email to scan")
	flag.Parse()

	if folder != "" {
		gitstats.Scan(folder)
		return
	}

	gitstats.Stats(email)
}
