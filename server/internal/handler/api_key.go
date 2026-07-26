package handler

import (
	"LingoLin-go/internal/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ApiKeyHandler struct {
	svc *service.ApiKeyService
}

func NewApiKeyHandler(svc *service.ApiKeyService) *ApiKeyHandler {
	return &ApiKeyHandler{svc: svc}
}

func (h *ApiKeyHandler) List(c *gin.Context) {
	userID := c.GetUint("user_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	keys, total, err := h.svc.List(userID, page, pageSize)
	if err != nil {
		Error(c, http.StatusInternalServerError, CodeInternalError, "获取密钥列表失败")
		return
	}

	Success(c, gin.H{
		"total":     total,
		"page":      page,
		"page_size": pageSize,
		"items":     keys,
	})
}

func (h *ApiKeyHandler) Create(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req service.CreateKeyReq
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, CodeBadRequest, "参数错误: "+err.Error())
		return
	}

	key, err := h.svc.Create(userID, &req)
	if err != nil {
		Error(c, http.StatusInternalServerError, CodeInternalError, "创建密钥失败")
		return
	}

	Success(c, key)
}

func (h *ApiKeyHandler) Update(c *gin.Context) {
	userID := c.GetUint("user_id")
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		Error(c, http.StatusBadRequest, CodeBadRequest, "无效的密钥 ID")
		return
	}

	var req service.UpdateKeyReq
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, CodeBadRequest, "参数错误: "+err.Error())
		return
	}

	if err := h.svc.Update(uint(id), userID, &req); err != nil {
		Error(c, http.StatusNotFound, CodeNotFound, err.Error())
		return
	}

	Success(c, nil)
}

func (h *ApiKeyHandler) Delete(c *gin.Context) {
	userID := c.GetUint("user_id")
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		Error(c, http.StatusBadRequest, CodeBadRequest, "无效的密钥 ID")
		return
	}

	if err := h.svc.Delete(uint(id), userID); err != nil {
		Error(c, http.StatusNotFound, CodeNotFound, err.Error())
		return
	}

	Success(c, nil)
}
