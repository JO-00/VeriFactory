package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"veriFactory/backend/internal/config"
)

type Server struct {
	router *gin.Engine
	logger *slog.Logger
	db     *pgxpool.Pool
	cfg    config.Config
}

func New(logger *slog.Logger, cfg config.Config, db *pgxpool.Pool) *Server {
	if cfg.App.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	router := gin.New()

	s := &Server{
		router: router,
		logger: logger,
		db:     db,
		cfg:    cfg,
	}

	router.Use(gin.Recovery())
	router.Use(s.requestLogger())

	s.registerRoutes()

	return s
}

func (s *Server) Handler() http.Handler {
	return s.router
}

func (s *Server) HTTPServer(host, port string) *http.Server {
	return &http.Server{
		Addr:              host + ":" + port,
		Handler:           s.router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
}

func (s *Server) requestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		c.Next()

		s.logger.Info("http request",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", c.Writer.Status(),
			"latency", time.Since(start),
			"client_ip", c.ClientIP(),
		)
	}
}

func (s *Server) databaseReady(ctx context.Context) error {
	if s.db == nil {
		return fmt.Errorf("database pool is not initialized")
	}

	return s.db.Ping(ctx)
}
