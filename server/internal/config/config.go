package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port                 string
	DBPath               string
	JWTSecret            string
	StorePath            string
	DefaultAdminPassword string
	MaxUploadSize        int64  // 上传文件大小上限（字节）
	PublicURL            string // 对外可达的服务地址（供 Web 面板生成分享连接，可为空）
}

func Load() *Config {
	cfg := &Config{
		Port:                  getEnv("PORT", "8080"),
		DBPath:                getEnv("DB_PATH", "data/lingolin.db"),
		JWTSecret:             getEnvRequired("JWT_SECRET", "change-me-in-production"),
		StorePath:             getEnv("STORE_PATH", "store"),
		DefaultAdminPassword: getEnv("DEFAULT_ADMIN_PASSWORD", "admin123"),
		MaxUploadSize:        int64(getEnvInt("MAX_UPLOAD_SIZE", 100)) * 1024 * 1024, // 默认 100MB
		PublicURL:            getEnv("PUBLIC_URL", ""),
	}
	return cfg
}

// EnsureDirs 确保存储目录存在
func (c *Config) EnsureDirs() error {
	if err := os.MkdirAll(c.StorePath, 0755); err != nil {
		return err
	}
	// 数据库父目录在 InitDB 中创建
	return nil
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

// getEnvRequired 获取环境变量，带警告（生产环境应显式设置）
func getEnvRequired(key, defaultVal string) string {
	v := os.Getenv(key)
	if v != "" {
		return v
	}
	fmt.Printf("[警告] 环境变量 %s 未设置，使用默认值（生产环境请务必修改）\n", key)
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return defaultVal
}
