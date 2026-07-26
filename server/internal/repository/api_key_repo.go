package repository

import (
	"LingoLin-go/internal/model"

	"gorm.io/gorm"
)

type ApiKeyRepo struct {
	db *gorm.DB
}

func NewApiKeyRepo(db *gorm.DB) *ApiKeyRepo {
	return &ApiKeyRepo{db: db}
}

func (r *ApiKeyRepo) Create(key *model.ApiKey) error {
	return r.db.Create(key).Error
}

func (r *ApiKeyRepo) FindByKeyHash(hash string) (*model.ApiKey, error) {
	var key model.ApiKey
	err := r.db.Where("key_hash = ?", hash).First(&key).Error
	if err != nil {
		return nil, err
	}
	return &key, nil
}

func (r *ApiKeyRepo) FindByID(id uint) (*model.ApiKey, error) {
	var key model.ApiKey
	err := r.db.First(&key, id).Error
	if err != nil {
		return nil, err
	}
	return &key, nil
}

func (r *ApiKeyRepo) ListByUserID(userID uint, page, pageSize int) ([]model.ApiKey, int64, error) {
	var keys []model.ApiKey
	var total int64

	query := r.db.Model(&model.ApiKey{}).Where("user_id = ?", userID)
	query.Count(&total)

	err := query.Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&keys).Error
	return keys, total, err
}

func (r *ApiKeyRepo) Delete(id uint, userID uint) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&model.ApiKey{}).Error
}

func (r *ApiKeyRepo) Update(id uint, updates map[string]interface{}) error {
	return r.db.Model(&model.ApiKey{}).Where("id = ?", id).Updates(updates).Error
}

func (r *ApiKeyRepo) UpdateLastUsed(id uint) error {
	return r.db.Model(&model.ApiKey{}).Where("id = ?", id).
		UpdateColumn("last_used_at", gorm.Expr("datetime('now')")).Error
}
