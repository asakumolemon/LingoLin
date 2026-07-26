package service

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"LingoLin-go/internal/model"
	"LingoLin-go/internal/repository"

	"gorm.io/gorm"
)

type ApiKeyService struct {
	keyRepo *repository.ApiKeyRepo
}

func NewApiKeyService(keyRepo *repository.ApiKeyRepo) *ApiKeyService {
	return &ApiKeyService{keyRepo: keyRepo}
}

type CreateKeyReq struct {
	Name        string               `json:"name" binding:"required,max=64"`
	Permissions model.KeyPermission  `json:"permissions"`
	ExpiresAt   *time.Time           `json:"expires_at,omitempty"`
}

type KeyResp struct {
	ID          uint                `json:"id"`
	Name        string              `json:"name"`
	Key         string              `json:"key,omitempty"`
	Permissions model.KeyPermission `json:"permissions"`
	UserID      uint                `json:"user_id"`
	IsActive    bool                `json:"is_active"`
	LastUsedAt  *time.Time          `json:"last_used_at,omitempty"`
	ExpiresAt   *time.Time          `json:"expires_at,omitempty"`
	CreatedAt   time.Time           `json:"created_at"`
}

// GenerateKey 生成随机 API Key
func GenerateKey() (string, string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", "", err
	}
	key := fmt.Sprintf("lingolin_%s", hex.EncodeToString(raw))
	hash := sha256.Sum256([]byte(key))
	return key, hex.EncodeToString(hash[:]), nil
}

func (s *ApiKeyService) Create(userID uint, req *CreateKeyReq) (*KeyResp, error) {
	raw, hash, err := GenerateKey()
	if err != nil {
		return nil, err
	}

	apiKey := &model.ApiKey{
		Name:       req.Name,
		Key:        raw,
		KeyHash:    hash,
		UserID:     userID,
		IsActive:   true,
		ExpiresAt:  req.ExpiresAt,
	}

	if err := apiKey.SetPermission(&req.Permissions); err != nil {
		return nil, err
	}

	if err := s.keyRepo.Create(apiKey); err != nil {
		return nil, err
	}

	return s.toKeyResp(apiKey), nil
}

func (s *ApiKeyService) List(userID uint, page, pageSize int) ([]KeyResp, int64, error) {
	keys, total, err := s.keyRepo.ListByUserID(userID, page, pageSize)
	if err != nil {
		return nil, 0, err
	}

	resp := make([]KeyResp, 0, len(keys))
	for _, k := range keys {
		respItem := s.toKeyResp(&k)
		respItem.Key = "" // 列表不返回密钥明文
		resp = append(resp, *respItem)
	}
	return resp, total, nil
}

func (s *ApiKeyService) Delete(id uint, userID uint) error {
	if err := s.keyRepo.Delete(id, userID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("密钥不存在")
		}
		return err
	}
	return nil
}

func (s *ApiKeyService) Update(id uint, userID uint, updates map[string]interface{}) error {
	if err := s.keyRepo.Update(id, updates); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("密钥不存在")
		}
		return err
	}
	return nil
}

// ValidateKey 验证 API Key 是否有效，返回密钥模型
func (s *ApiKeyService) ValidateKey(rawKey string) (*model.ApiKey, error) {
	hash := sha256.Sum256([]byte(rawKey))
	keyHash := hex.EncodeToString(hash[:])

	apiKey, err := s.keyRepo.FindByKeyHash(keyHash)
	if err != nil {
		return nil, errors.New("无效的 API Key")
	}

	if !apiKey.IsActive {
		return nil, errors.New("API Key 已被禁用")
	}

	if apiKey.IsExpired() {
		return nil, errors.New("API Key 已过期")
	}

	// 更新最后使用时间
	_ = s.keyRepo.UpdateLastUsed(apiKey.ID)

	return apiKey, nil
}

func (s *ApiKeyService) toKeyResp(k *model.ApiKey) *KeyResp {
	perm, _ := k.GetPermission()
	return &KeyResp{
		ID:          k.ID,
		Name:        k.Name,
		Key:         k.Key,
		Permissions: *perm,
		UserID:      k.UserID,
		IsActive:    k.IsActive,
		LastUsedAt:  k.LastUsedAt,
		ExpiresAt:   k.ExpiresAt,
		CreatedAt:   k.CreatedAt,
	}
}
