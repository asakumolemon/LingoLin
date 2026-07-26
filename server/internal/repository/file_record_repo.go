package repository

import (
	"LingoLin-go/internal/model"
	"gorm.io/gorm"
)

type FileRecordRepo struct {
	db *gorm.DB
}

func NewFileRecordRepo(db *gorm.DB) *FileRecordRepo {
	return &FileRecordRepo{db: db}
}

// Create 创建上传记录
func (r *FileRecordRepo) Create(record *model.FileRecord) error {
	return r.db.Create(record).Error
}

// FindPathsByApiKeyID 返回指定密钥上传过的所有文件路径
func (r *FileRecordRepo) FindPathsByApiKeyID(apiKeyID uint) ([]string, error) {
	var paths []string
	err := r.db.Model(&model.FileRecord{}).
		Where("api_key_id = ?", apiKeyID).
		Pluck("path", &paths).Error
	return paths, err
}
