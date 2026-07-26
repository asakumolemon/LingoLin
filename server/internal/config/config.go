package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port      string
	DBPath    string
	JWTSecret string
	StorePath string
	DefaultAdminPassword string
}

func Load() *Config {
	cfg := &Config{
		Port:      getEnv("PORT", "8080"),
		DBPath:    getEnv("DB_PATH", "data/lingolin.db"),
		JWTSecret: getEnv("JWT_SECRET", "change-me-in-production"),
		StorePath: getEnv("STORE_PATH", "store"),
		DefaultAdminPassword: getEnv("DEFAULT_ADMIN_PASSWORD", "admin123"),
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

func getEnvInt(key string, defaultVal int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return defaultVal
}
