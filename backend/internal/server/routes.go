package server

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"veriFactory/backend/internal/modules/reviews"
	"veriFactory/backend/internal/modules/users"
)

func (s *Server) registerRoutes() {
	s.router.GET("/health/live", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	s.router.GET("/health/ready", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		if err := s.databaseReady(ctx); err != nil {
			s.logger.Error("readiness check failed", "error", err)
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status": "not_ready",
				"reason": "database unavailable",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":   "ok",
			"database": "connected",
		})
	})

	api := s.router.Group("/api/v1")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status":  "ok",
				"service": "verifactory-backend",
			})
		})

		reviewsRepo := reviews.NewRepository(s.db)
		reviewsSvc := reviews.NewService(reviewsRepo, s.logger)
		reviewsHandler := reviews.NewHandler(reviewsSvc, s.logger)
		reviewsHandler.RegisterRoutes(api)

		usersRepo := users.NewRepository(s.db)
		usersSvc := users.NewService(usersRepo, s.logger)
		usersHandler := users.NewHandler(usersSvc, s.logger)
		usersHandler.RegisterRoutes(api)
	}
}
