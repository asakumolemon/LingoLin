package model

import "time"

// FileRecord 文件上传记录，追踪文件归属密钥
type FileRecord struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	Path      string    `gorm:"size:512;index;not null" json:"path"`
	ApiKeyID  uint      `gorm:"index;not null" json:"api_key_id"`
	CreatedAt time.Time `json:"created_at"`
}
