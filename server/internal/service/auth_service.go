package service

import (
	"errors"
	"log"
	"time"

	"LingoLin-go/internal/model"
	"LingoLin-go/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	userRepo  *repository.UserRepo
	jwtSecret string
}

func NewAuthService(userRepo *repository.UserRepo, jwtSecret string) *AuthService {
	return &AuthService{userRepo: userRepo, jwtSecret: jwtSecret}
}

type RegisterReq struct {
	Username string `json:"username" binding:"required,min=2,max=64"`
	Password string `json:"password" binding:"required,min=6,max=128"`
}

type LoginReq struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResp struct {
	Token     string     `json:"token"`
	ExpiresIn int64      `json:"expires_in"`
	User      UserBrief  `json:"user"`
}

type UserBrief struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"`
}

func (s *AuthService) Register(req *RegisterReq) (*model.User, error) {
	// 检查用户名是否已存在
	existing, err := s.userRepo.FindByUsername(req.Username)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("用户名已存在")
	}

	// 检查是否是第一个用户（自动成为管理员）
	count, err := s.userRepo.Count()
	if err != nil {
		return nil, err
	}

	role := "user"
	if count == 0 {
		role = "admin"
	}

	user := &model.User{
		Username: req.Username,
		Password: req.Password,
		Role:     role,
	}
	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *AuthService) Login(req *LoginReq) (*LoginResp, error) {
	user, err := s.userRepo.FindByUsername(req.Username)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户名或密码错误")
		}
		return nil, err
	}

	if !user.CheckPassword(req.Password) {
		return nil, errors.New("用户名或密码错误")
	}

	// 生成 JWT
	expiresIn := int64(24 * 3600) // 24 小时
	claims := jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"role":     user.Role,
		"exp":      time.Now().Unix() + expiresIn,
		"iat":      time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return nil, err
	}

	return &LoginResp{
		Token:     tokenString,
		ExpiresIn: expiresIn,
		User: UserBrief{
			ID:       user.ID,
			Username: user.Username,
			Role:     user.Role,
		},
	}, nil
}

// ValidateJWT 解析并验证 JWT，返回用户 ID
func (s *AuthService) ValidateJWT(tokenString string) (uint, string, string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("无效的签名方法")
		}
		return []byte(s.jwtSecret), nil
	})
	if err != nil {
		return 0, "", "", err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return 0, "", "", errors.New("无效的 Token")
	}

	userID := uint(claims["user_id"].(float64))
	username := claims["username"].(string)
	role := claims["role"].(string)
	return userID, username, role, nil
}

// 密码加密工具（独立使用，不经过 GORM hook 时调用）
func HashPassword(password string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashed), nil
}

// EnsureDefaultAdmin 检测无用户时自动创建默认管理员
func (s *AuthService) EnsureDefaultAdmin(password string) {
	count, err := s.userRepo.Count()
	if err != nil {
		log.Printf("[警告] 检查用户数量失败: %v", err)
		return
	}
	if count > 0 {
		return
	}

	user := &model.User{
		Username: "admin",
		Password: password,
		Role:     "admin",
	}
	if err := s.userRepo.Create(user); err != nil {
		log.Printf("[警告] 创建默认管理员失败: %v", err)
		return
	}
	log.Printf("已创建默认管理员账号（用户名: admin, 密码: %s），请尽快修改密码！", password)
}
