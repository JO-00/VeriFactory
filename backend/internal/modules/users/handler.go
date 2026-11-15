package users

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc    *Service
	logger *slog.Logger
}

func NewHandler(svc *Service, logger *slog.Logger) *Handler {
	return &Handler{
		svc:    svc,
		logger: logger,
	}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.POST("/users", h.registerUser)
	rg.GET("/users/:wallet", h.getUser)
	rg.PUT("/users/:wallet/favorites", h.setFavorites)
	rg.POST("/users/:wallet/favorites", h.addFavorite)
	rg.DELETE("/users/:wallet/favorites/:facilityAddr", h.removeFavorite)
}

func (h *Handler) registerUser(c *gin.Context) {
	var req RegisterUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request_body", "details": err.Error()})
		return
	}

	res, err := h.svc.RegisterUser(c.Request.Context(), req)
	if err != nil {
		h.writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *Handler) getUser(c *gin.Context) {
	res, err := h.svc.GetUser(c.Request.Context(), c.Param("wallet"))
	if err != nil {
		h.writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *Handler) setFavorites(c *gin.Context) {
	var req SetFavoritesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request_body", "details": err.Error()})
		return
	}

	favs, err := h.svc.SetFavorites(c.Request.Context(), c.Param("wallet"), req)
	if err != nil {
		h.writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"wallet_address": c.Param("wallet"), "favorite_facilities": favs})
}

func (h *Handler) addFavorite(c *gin.Context) {
	var req AddFavoriteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request_body", "details": err.Error()})
		return
	}

	favs, err := h.svc.AddFavorite(c.Request.Context(), c.Param("wallet"), req.FacilityAddress)
	if err != nil {
		h.writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"wallet_address": c.Param("wallet"), "favorite_facilities": favs})
}

func (h *Handler) removeFavorite(c *gin.Context) {
	favs, err := h.svc.RemoveFavorite(c.Request.Context(), c.Param("wallet"), c.Param("facilityAddr"))
	if err != nil {
		h.writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"wallet_address": c.Param("wallet"), "favorite_facilities": favs})
}

func (h *Handler) writeError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrInvalidInput):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, ErrUserNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
	case errors.Is(err, ErrFavoriteNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "favorite facility not found"})
	default:
		h.logger.Error("users api error", "path", c.Request.URL.Path, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal_server_error"})
	}
}
