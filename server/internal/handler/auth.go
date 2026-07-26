package handler

import (
	"LingoLin-go/internal/service"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	svc *service.AuthService
}

func NewAuthHandler(svc *service.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req service.RegisterReq
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, CodeBadRequest, "参数错误: "+err.Error())
		return
	}

	user, err := h.svc.Register(&req)
	if err != nil {
		Error(c, http.StatusBadRequest, CodeBadRequest, err.Error())
		return
	}

	Success(c, gin.H{
		"id":       user.ID,
		"username": user.Username,
		"role":     user.Role,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req service.LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, CodeBadRequest, "参数错误: "+err.Error())
		return
	}

	resp, err := h.svc.Login(&req)
	if err != nil {
		Error(c, http.StatusUnauthorized, CodeUnauthorized, err.Error())
		return
	}

	Success(c, resp)
}
