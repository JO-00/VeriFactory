package reviews

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"

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
	rg.GET("/facilities/:addr/reviews", h.listReviews)
	rg.POST("/facilities/:addr/reviews", h.upsertReview)
	rg.PUT("/facilities/:addr/reviews", h.upsertReview)
	rg.DELETE("/facilities/:addr/reviews", h.deleteReview)
	rg.GET("/facilities/:addr/reputation", h.getReputation)
}

func (h *Handler) upsertReview(c *gin.Context) {
	var req UpsertReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request_body", "details": err.Error()})
		return
	}

	res, err := h.svc.UpsertReview(c.Request.Context(), c.Param("addr"), req)
	if err != nil {
		h.writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *Handler) deleteReview(c *gin.Context) {
	var req DeleteReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request_body", "details": err.Error()})
		return
	}

	if err := h.svc.DeleteReview(c.Request.Context(), c.Param("addr"), req); err != nil {
		h.writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

func (h *Handler) listReviews(c *gin.Context) {
	start := int32(0)
	pageSize := int32(20)

	if s, err := strconv.Atoi(c.Query("start")); err == nil && s >= 0 {
		start = int32(s)
	}
	if ps, err := strconv.Atoi(c.Query("page_size")); err == nil && ps > 0 {
		if ps > 100 {
			ps = 100
		}
		pageSize = int32(ps)
	}

	res, err := h.svc.ListVerifiedReviews(c.Request.Context(), c.Param("addr"), start, pageSize)
	if err != nil {
		h.writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *Handler) getReputation(c *gin.Context) {
	res, err := h.svc.GetFacilityReputation(c.Request.Context(), c.Param("addr"))
	if err != nil {
		h.writeError(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *Handler) writeError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrInvalidInput):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, ErrInvalidSignature):
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
	case errors.Is(err, ErrReviewNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "review not found"})
	default:
		h.logger.Error("reviews api error", "path", c.Request.URL.Path, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal_server_error"})
	}
}
