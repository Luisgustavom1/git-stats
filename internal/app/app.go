package app

import (
	"context"
	"errors"
	"git-stats/internal/gitstats"
	"strings"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// Startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) GetDashboardSnapshot() (gitstats.DashboardSnapshot, error) {
	email := strings.TrimSpace("luisgustavomacedo13@gmail.com")
	snapshot, err := gitstats.BuildDashboardSnapshot(email, 26, 20)
	if err != nil {
		return gitstats.DashboardSnapshot{}, friendlyDashboardError(err)
	}

	return snapshot, nil
}

func friendlyDashboardError(err error) error {
	switch {
	case errors.Is(err, gitstats.ErrEmailNotConfigured):
		return errors.New("Defina a variável de ambiente GIT_STATS_EMAIL para carregar o dashboard")
	case errors.Is(err, gitstats.ErrNoRepositoriesConfigured):
		return errors.New("Nenhum repositório configurado. Adicione pastas com o comando: go run . --add /caminho")
	case errors.Is(err, gitstats.ErrNoValidRepositories):
		return errors.New("Nenhum repositório válido encontrado no arquivo .gitstats")
	default:
		return errors.New("Não foi possível carregar as estatísticas agora. Tente novamente")
	}
}
