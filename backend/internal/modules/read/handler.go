package read

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc    *Service
	logger *slog.Logger
}

func NewHandler(svc *Service, logger *slog.Logger) *Handler {
	return &Handler{svc: svc, logger: logger}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	// (facilityAddress, gatewayId) -> message[]
	rg.GET("/facilities/:addr/gateways/:gatewayId/documents", h.getGatewayDocuments)

	// ?inspectorAddress=0x... | ?facilityAddress=0x... | ?facilityAddress=0x...&inspectorAddress=0x... -> message[]
	rg.GET("/inspector-reports", h.getInspectorReports)

	rg.GET("/gateway-documents", h.getAllGatewayDocuments)
}

func (h *Handler) getGatewayDocuments(c *gin.Context) {
	items, err := h.svc.ListGatewayDocuments(c.Request.Context(), c.Param("addr"), c.Param("gatewayId"))
	if err != nil {
		h.logger.Error("failed to list gateway documents", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal_server_error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"messages": items})
}

func (h *Handler) getAllGatewayDocuments(c *gin.Context) {
	items, err := h.svc.ListAllGatewayDocuments(c.Request.Context())
	if err != nil {
		h.logger.Error("failed to list all gateway documents", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal_server_error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"messages": items})
}

func (h *Handler) getInspectorReports(c *gin.Context) {
	facility := strings.TrimSpace(c.Query("facilityAddress"))
	inspector := strings.TrimSpace(c.Query("inspectorAddress"))

	if facility == "" && inspector == "" {
		items, err := h.svc.ListAllInspectorReports(c.Request.Context())
		if err != nil {
			h.logger.Error("failed to list all inspector reports", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal_server_error"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"messages": items})
		return
	}

	items, err := h.svc.QueryInspectorReports(c.Request.Context(), facility, inspector)
	if err != nil {
		h.logger.Error("failed to query inspector reports", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal_server_error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"messages": items})
}
