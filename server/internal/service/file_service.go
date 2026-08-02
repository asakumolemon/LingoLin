package service

import (
	"errors"
	"fmt"
	"io"
	"io/fs"
	"mime"
	"os"
	"path/filepath"
	"strings"
	"time"

	"LingoLin-go/internal/model"
	"LingoLin-go/internal/repository"
)

var ErrFileAlreadyExists = errors.New("文件已存在")

type FileService struct {
	storePath     string
	recordRepo    *repository.FileRecordRepo
	MaxUploadSize int64
}

func NewFileService(storePath string, recordRepo *repository.FileRecordRepo, maxUploadSize int64) *FileService {
	return &FileService{storePath: storePath, recordRepo: recordRepo, MaxUploadSize: maxUploadSize}
}

type FileItem struct {
	Name      string    `json:"name"`
	Path      string    `json:"path"`
	Type      string    `json:"type"` // "file" 或 "dir"
	Size      int64     `json:"size"`
	MimeType  string    `json:"mime_type"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ListResp struct {
	Path  string     `json:"path"`
	Items []FileItem `json:"items"`
}

// sanitizePath 清理并验证路径，防止路径穿越
func (s *FileService) sanitizePath(apiPath string) (string, error) {
	if apiPath == "" {
		apiPath = "/"
	}
	// 清理路径
	clean := filepath.Clean(apiPath)
	clean = strings.ReplaceAll(clean, "\\", "/")
	// 确保以 / 开头
	if !strings.HasPrefix(clean, "/") {
		clean = "/" + clean
	}

	absStore, _ := filepath.Abs(s.storePath)
	absTarget := filepath.Join(absStore, clean)

	// 路径穿越检查
	rel, err := filepath.Rel(absStore, absTarget)
	if err != nil || strings.HasPrefix(rel, "..") {
		return "", errors.New("路径无效")
	}

	return clean, nil
}

// toRealPath 将 API 路径转为实际文件系统路径
func (s *FileService) toRealPath(apiPath string) string {
	return filepath.Join(s.storePath, apiPath)
}

// CheckAccess 检查路径是否在允许的路径范围内
func (s *FileService) CheckAccess(apiPath string, perm *model.KeyPermission, needWrite bool) error {
	if perm == nil || len(perm.AllowPaths) == 0 {
		return errors.New("没有配置允许访问的路径")
	}
	if needWrite && !perm.Write {
		return errors.New("没有写入权限")
	}

	cleanPath, err := s.sanitizePath(apiPath)
	if err != nil {
		return err
	}

	normPath := strings.TrimRight(cleanPath, "/")
	if normPath == "" {
		normPath = "/"
	}

	for _, allow := range perm.AllowPaths {
		// 兼容 /* 写法，等价于 /
		pa := strings.TrimSuffix(allow, "/*")
		normAllow := strings.TrimRight(pa, "/")
		if normAllow == "" {
			normAllow = "/"
		}

		// / 表示完全通行
		if normAllow == "/" {
			return nil
		}

		// 精确匹配或子路径匹配（加 / 分隔防止 /test 匹配 /test123）
		if normPath == normAllow || strings.HasPrefix(normPath, normAllow+"/") {
			return nil
		}
	}
	return errors.New("无权访问该路径")
}

// List 列出目录内容（目录始终可见，文件按权限过滤）
func (s *FileService) List(apiPath string, perm *model.KeyPermission, apiKeyID uint) (*ListResp, error) {
	cleanPath, err := s.sanitizePath(apiPath)
	if err != nil {
		return nil, err
	}

	realPath := s.toRealPath(cleanPath)
	entries, err := os.ReadDir(realPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, errors.New("目录不存在")
		}
		return nil, err
	}

	items := make([]FileItem, 0, len(entries))

	// 写专用密钥（read=false）：只显示该密钥上传过的文件
	var uploadedPaths map[string]bool
	if perm != nil && !perm.Read && s.recordRepo != nil {
		paths, err := s.recordRepo.FindPathsByApiKeyID(apiKeyID)
		if err == nil {
			uploadedPaths = make(map[string]bool, len(paths))
			for _, p := range paths {
				uploadedPaths[p] = true
			}
		}
	}

	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}

		itemPath := filepath.Join(cleanPath, entry.Name())
		itemPath = strings.ReplaceAll(itemPath, "\\", "/")

		item := FileItem{
			Name:      entry.Name(),
			Path:      itemPath,
			Size:      info.Size(),
			UpdatedAt: info.ModTime(),
		}

		if entry.IsDir() {
			item.Type = "dir"
			// 目录始终可见
		} else {
			item.Type = "file"
			item.MimeType = s.detectMimeType(entry.Name())
			// 文件需要检查权限
			if perm != nil {
				if err := s.CheckAccess(itemPath, perm, false); err != nil {
					continue // 无权访问此文件，跳过
				}
				// 写专用密钥：只显示自己上传的文件
				if !perm.Read && uploadedPaths != nil && !uploadedPaths[itemPath] {
					continue
				}
			}
		}

		items = append(items, item)
	}

	return &ListResp{
		Path:  cleanPath,
		Items: items,
	}, nil
}

// Upload 保存上传文件
func (s *FileService) Upload(apiPath string, reader io.Reader, apiKeyID uint, overwrite bool) (*FileItem, error) {
	cleanPath, err := s.sanitizePath(apiPath)
	if err != nil {
		return nil, err
	}

	realPath := s.toRealPath(cleanPath)
	parentDir := filepath.Dir(realPath)

	// 确保父目录存在
	if err := os.MkdirAll(parentDir, 0755); err != nil {
		return nil, errors.New("无法创建目录")
	}

	// 防止文件路径覆盖目录
	if info, statErr := os.Stat(realPath); statErr == nil {
		if info.IsDir() {
			return nil, errors.New("目标路径是目录")
		}
		if !overwrite {
			return nil, ErrFileAlreadyExists
		}
	} else if !os.IsNotExist(statErr) {
		return nil, fmt.Errorf("无法检查目标文件: %w", statErr)
	}

	// 写入文件
	dst, err := os.Create(realPath)
	if err != nil {
		return nil, fmt.Errorf("无法创建文件: %w", err)
	}
	defer dst.Close()

	written, err := io.Copy(dst, reader)
	if err != nil {
		return nil, fmt.Errorf("写入文件失败: %w", err)
	}

	name := filepath.Base(cleanPath)

	// 记录文件上传来源（仅 API Key 上传时记录）
	if s.recordRepo != nil && apiKeyID > 0 {
		_ = s.recordRepo.Create(&model.FileRecord{
			Path:     cleanPath,
			ApiKeyID: apiKeyID,
		})
	}

	return &FileItem{
		Name:      name,
		Path:      cleanPath,
		Type:      "file",
		Size:      written,
		MimeType:  s.detectMimeType(name),
		UpdatedAt: time.Now(),
	}, nil
}

// Download 返回文件读取流
func (s *FileService) Download(apiPath string) (io.ReadCloser, string, int64, error) {
	cleanPath, err := s.sanitizePath(apiPath)
	if err != nil {
		return nil, "", 0, err
	}

	realPath := s.toRealPath(cleanPath)
	file, err := os.Open(realPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, "", 0, errors.New("文件不存在")
		}
		return nil, "", 0, err
	}

	info, err := file.Stat()
	if err != nil {
		file.Close()
		return nil, "", 0, err
	}

	if info.IsDir() {
		file.Close()
		return nil, "", 0, fmt.Errorf("不能下载目录: %s", cleanPath)
	}

	mimeType := s.detectMimeType(cleanPath)
	return file, mimeType, info.Size(), nil
}

// Preview 预览文件（图片直接返回流，文本返回内容）
func (s *FileService) Preview(apiPath string) (io.ReadCloser, string, int64, error) {
	cleanPath, err := s.sanitizePath(apiPath)
	if err != nil {
		return nil, "", 0, err
	}

	// 检查是否为可预览类型
	mimeType := s.detectMimeType(cleanPath)
	if !s.isPreviewable(mimeType) {
		return nil, "", 0, fmt.Errorf("不支持预览该文件类型: %s", mimeType)
	}

	return s.Download(cleanPath)
}

// Mkdir 创建目录
func (s *FileService) Mkdir(apiPath string) (*FileItem, error) {
	cleanPath, err := s.sanitizePath(apiPath)
	if err != nil {
		return nil, err
	}

	if cleanPath == "/" {
		return nil, errors.New("不能创建根目录")
	}

	realPath := s.toRealPath(cleanPath)
	if err := os.MkdirAll(realPath, 0755); err != nil {
		return nil, errors.New("无法创建目录")
	}

	name := filepath.Base(cleanPath)
	return &FileItem{
		Name:      name,
		Path:      cleanPath,
		Type:      "dir",
		UpdatedAt: time.Now(),
	}, nil
}

// Remove 删除文件或目录
func (s *FileService) Remove(apiPath string) error {
	cleanPath, err := s.sanitizePath(apiPath)
	if err != nil {
		return err
	}

	if cleanPath == "/" {
		return errors.New("不能删除根目录")
	}

	realPath := s.toRealPath(cleanPath)

	// 检查是否存在
	info, err := os.Stat(realPath)
	if err != nil {
		if os.IsNotExist(err) {
			return errors.New("文件或目录不存在")
		}
		return err
	}

	if info.IsDir() {
		if err := os.RemoveAll(realPath); err != nil {
			return errors.New("删除目录失败")
		}
	} else {
		if err := os.Remove(realPath); err != nil {
			return errors.New("删除文件失败")
		}
	}

	return nil
}

// Exists 检查路径是否存在
func (s *FileService) Exists(apiPath string) (bool, error) {
	cleanPath, err := s.sanitizePath(apiPath)
	if err != nil {
		return false, err
	}
	realPath := s.toRealPath(cleanPath)
	_, err = os.Stat(realPath)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}

// Walk 获取目录下所有文件（用于归档/备份等场景）
func (s *FileService) Walk(apiPath string, fn func(path string, info fs.FileInfo) error) error {
	cleanPath, err := s.sanitizePath(apiPath)
	if err != nil {
		return err
	}
	realPath := s.toRealPath(cleanPath)
	return filepath.Walk(realPath, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}
		relPath, _ := filepath.Rel(s.storePath, path)
		relPath = strings.ReplaceAll(relPath, "\\", "/")
		return fn("/"+relPath, info)
	})
}

func (s *FileService) detectMimeType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".bmp":
		return "image/bmp"
	case ".svg":
		return "image/svg+xml"
	case ".txt":
		return "text/plain; charset=utf-8"
	case ".md":
		return "text/markdown; charset=utf-8"
	case ".json":
		return "application/json"
	case ".js":
		return "text/javascript; charset=utf-8"
	case ".html", ".htm":
		return "text/html; charset=utf-8"
	case ".css":
		return "text/css; charset=utf-8"
	case ".xml":
		return "text/xml; charset=utf-8"
	case ".yaml", ".yml":
		return "text/yaml; charset=utf-8"
	case ".pdf":
		return "application/pdf"
	case ".zip":
		return "application/zip"
	default:
		mimeType := mime.TypeByExtension(ext)
		if mimeType == "" {
			return "application/octet-stream"
		}
		return mimeType
	}
}

func (s *FileService) isPreviewable(mimeType string) bool {
	// 图片类型
	if strings.HasPrefix(mimeType, "image/") {
		return true
	}
	// 文本类型
	if strings.Contains(mimeType, "text/") {
		return true
	}
	// JSON、XML 等也视为可预览
	switch mimeType {
	case "application/json", "application/xml", "text/xml":
		return true
	}
	return false
}
