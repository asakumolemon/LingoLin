package model

import (
	"encoding/json"
	"time"
)

type KeyPermission struct {
	AllowPaths []string `json:"allow_paths"`
	Read       bool     `json:"read"`
	Write      bool     `json:"write"`
}

type ApiKey struct {
	ID          uint       `gorm:"primarykey" json:"id"`
	Name        string     `gorm:"size:64;not null" json:"name"`
	Key         string     `gorm:"uniqueIndex;size:64;not null" json:"key,omitempty"`
	KeyHash     string     `gorm:"size:128;not null" json:"-"`
	Permissions string     `gorm:"type:text" json:"-"`
	UserID      uint       `gorm:"index;not null" json:"user_id"`
	IsActive    bool       `gorm:"default:true" json:"is_active"`
	LastUsedAt  *time.Time `json:"last_used_at,omitempty"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// GetPermission 解析权限 JSON 为结构体
func (k *ApiKey) GetPermission() (*KeyPermission, error) {
	var p KeyPermission
	if k.Permissions == "" {
		return &KeyPermission{}, nil
	}
	if err := json.Unmarshal([]byte(k.Permissions), &p); err != nil {
		return nil, err
	}
	return &p, nil
}

// SetPermission 将权限结构体序列化为 JSON
func (k *ApiKey) SetPermission(p *KeyPermission) error {
	data, err := json.Marshal(p)
	if err != nil {
		return err
	}
	k.Permissions = string(data)
	return nil
}

// IsExpired 检查密钥是否过期
func (k *ApiKey) IsExpired() bool {
	if k.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*k.ExpiresAt)
}
