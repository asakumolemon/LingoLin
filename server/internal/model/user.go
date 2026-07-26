package model

import (
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type User struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	Username  string    `gorm:"uniqueIndex;size:64;not null" json:"username"`
	Password  string    `gorm:"size:256;not null" json:"-"`
	Role      string    `gorm:"size:16;default:user" json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// isBcryptHash 检测是否已经是 bcrypt 密文
func isBcryptHash(s string) bool {
	return len(s) == 60 && (s[0:4] == "$2a$" || s[0:4] == "$2b$" || s[0:4] == "$2y$")
}

// BeforeSave 在保存前自动加密密码（仅对明文密码加密，跳过已 hash 的值）
func (u *User) BeforeSave(tx *gorm.DB) error {
	if u.Password != "" && !isBcryptHash(u.Password) {
		hashed, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		u.Password = string(hashed)
	}
	return nil
}

// CheckPassword 校验密码
func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	return err == nil
}
