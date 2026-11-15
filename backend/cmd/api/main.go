package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"veriFactory/backend/internal/config"
	"veriFactory/backend/internal/database"
	"veriFactory/backend/internal/platform/logger"
	"veriFactory/backend/internal/server"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("configuration error: %v", err)
	}

	appLogger := logger.New(cfg.App.LogLevel, cfg.App.Environment)

	startupCtx, startupCancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer startupCancel()

	pool, err := database.NewPostgresPool(startupCtx, cfg.Database)
	if err != nil {
		appLogger.Error("database initialization failed", "error", err)
	}
	defer pool.Close()

	appServer := server.New(appLogger, cfg, pool)

	httpServer := appServer.HTTPServer(
		cfg.Server.Host,
		cfg.Server.Port,
	)

	go func() {
		appLogger.Info("starting server",
			"address", httpServer.Addr,
			"environment", cfg.App.Environment,
		)

		if err := httpServer.ListenAndServe(); err != nil &&
			!errors.Is(err, http.ErrServerClosed) {
			appLogger.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(
		context.Background(),
		cfg.Server.ShutdownTimeout,
	)
	defer cancel()

	if err := httpServer.Shutdown(ctx); err != nil {
		appLogger.Error("graceful shutdown failed", "error", err)
	}

	appLogger.Info("server stopped")
}
