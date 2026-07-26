package repository

import (
	"LingoLin-go/internal/model"

	"gorm.io/gorm"
)

type UserRepo struct {
	db *gorm.DB
}

func NewUserRepo(db *gorm.DB) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) Create(user *model.User) error {
	return r.db.Create(user).Error
}

func (r *UserRepo) FindByUsername(username string) (*model.User, error) {
	var user model.User
	err := r.db.Where("username = ?", username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepo) FindByID(id uint) (*model.User, error) {
	var user model.User
	err := r.db.First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepo) Count() (int64, error) {
	var count int64
	err := r.db.Model(&model.User{}).Count(&count).Error
	return count, err
}

// FirstOrCreateAdmin 原子性创建管理员（防竞态）
func (r *UserRepo) FirstOrCreateAdmin(password string) error {
	user := &model.User{Username: "admin", Password: password, Role: "admin"}
	return r.db.Where("username = ?", "admin").FirstOrCreate(user).Error
}
