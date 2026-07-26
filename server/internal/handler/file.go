package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"path/filepath"
	"strconv"

	"LingoLin-go/internal/model"
	"LingoLin-go/internal/service"
	"github.com/gin-gonic/gin"
)

type FileHandler struct {
	svc *service.FileService
}

func NewFileHandler(svc *service.FileService) *FileHandler {
	return &FileHandler{svc: svc}
}

// getPermission 从上下文中解析 API Key 权限，JWT 路由返回 nil（不限制）
func getPermission(c *gin.Context) *model.KeyPermission {
	permStr, exists := c.Get("api_key_permissions")
	if !exists {
		return nil
	}
	var perm model.KeyPermission
	if err := json.Unmarshal([]byte(permStr.(string)), &perm); err != nil {
		return nil
	}
	return &perm
}

func (h *FileHandler) List(c *gin.Context) {
	path := c.Query("path")
	if path == "" {
		path = "/"
	}

	perm := getPermission(c)
	apiKeyID, _ := c.Get("api_key_id")
	keyID, _ := apiKeyID.(uint)

	resp, err := h.svc.List(path, perm, keyID)
	if err != nil {
		Error(c, http.StatusBadRequest, CodeFileError, err.Error())
		return
	}

	Success(c, resp)
}

func (h *FileHandler) Upload(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		Error(c, http.StatusBadRequest, CodeBadRequest, "请选择要上传的文件")
		return
	}
	defer file.Close()

	apiPath := c.PostForm("path")
	if apiPath == "" {
		// 如果没有指定路径，使用文件名
		apiPath = "/" + header.Filename
	} else {
		// 如果指定的是目录路径，追加文件名
		ext := filepath.Ext(apiPath)
		if ext == "" {
			apiPath = filepath.Join(apiPath, header.Filename)
		}
	}

	perm := getPermission(c)
	if perm != nil {
		if err := h.svc.CheckAccess(apiPath, perm, true); err != nil {
			Error(c, http.StatusForbidden, CodeForbidden, err.Error())
			return
		}
	}

	apiKeyID, _ := c.Get("api_key_id")
	keyID, _ := apiKeyID.(uint)

	item, err := h.svc.Upload(apiPath, file, keyID)
	if err != nil {
		Error(c, http.StatusBadRequest, CodeFileError, err.Error())
		return
	}

	Success(c, item)
}

func (h *FileHandler) Download(c *gin.Context) {
	path := c.Query("path")
	if path == "" {
		Error(c, http.StatusBadRequest, CodeBadRequest, "请指定文件路径")
		return
	}

	perm := getPermission(c)
	if perm != nil {
		if err := h.svc.CheckAccess(path, perm, false); err != nil {
			Error(c, http.StatusForbidden, CodeForbidden, err.Error())
			return
		}
	}

	reader, mimeType, size, err := h.svc.Download(path)
	if err != nil {
		Error(c, http.StatusBadRequest, CodeFileError, err.Error())
		return
	}
	defer reader.Close()

	c.Header("Content-Type", mimeType)
	c.Header("Content-Disposition", "attachment; filename=\""+filepath.Base(path)+"\"")
	c.Header("Content-Length", formatSize(size))
	io.Copy(c.Writer, reader)
}

func (h *FileHandler) Preview(c *gin.Context) {
	path := c.Query("path")
	if path == "" {
		Error(c, http.StatusBadRequest, CodeBadRequest, "请指定文件路径")
		return
	}

	perm := getPermission(c)
	if perm != nil {
		if err := h.svc.CheckAccess(path, perm, false); err != nil {
			Error(c, http.StatusForbidden, CodeForbidden, err.Error())
			return
		}
	}

	reader, mimeType, size, err := h.svc.Preview(path)
	if err != nil {
		Error(c, http.StatusBadRequest, CodeFileError, err.Error())
		return
	}
	defer reader.Close()

	c.Header("Content-Type", mimeType)
	c.Header("Content-Length", formatSize(size))
	io.Copy(c.Writer, reader)
}

func (h *FileHandler) Mkdir(c *gin.Context) {
	var req struct {
		Path string `json:"path" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, CodeBadRequest, "请指定目录路径")
		return
	}

	perm := getPermission(c)
	if perm != nil {
		if err := h.svc.CheckAccess(req.Path, perm, true); err != nil {
			Error(c, http.StatusForbidden, CodeForbidden, err.Error())
			return
		}
	}

	item, err := h.svc.Mkdir(req.Path)
	if err != nil {
		Error(c, http.StatusBadRequest, CodeFileError, err.Error())
		return
	}

	Success(c, item)
}

func (h *FileHandler) Remove(c *gin.Context) {
	path := c.Query("path")
	if path == "" {
		Error(c, http.StatusBadRequest, CodeBadRequest, "请指定文件或目录路径")
		return
	}

	perm := getPermission(c)
	if perm != nil {
		if err := h.svc.CheckAccess(path, perm, true); err != nil {
			Error(c, http.StatusForbidden, CodeForbidden, err.Error())
			return
		}
	}

	if err := h.svc.Remove(path); err != nil {
		Error(c, http.StatusBadRequest, CodeFileError, err.Error())
		return
	}

	Success(c, nil)
}

// MyPermissions 返回当前密钥的权限信息
func (h *FileHandler) MyPermissions(c *gin.Context) {
	perm := getPermission(c)
	if perm == nil {
		// JWT 管理端或无权限信息，返回完全访问
		perm = &model.KeyPermission{
			AllowPaths: []string{"/"},
			Read:       true,
			Write:      true,
		}
	}
	Success(c, perm)
}

func formatSize(size int64) string {
	return strconv.FormatInt(size, 10)
}
