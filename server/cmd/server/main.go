package main

import (
	"log"
	"time"

	"LingoLin-go/internal/config"
	"LingoLin-go/internal/handler"
	"LingoLin-go/internal/middleware"
	"LingoLin-go/internal/model"
	"LingoLin-go/internal/repository"
	"LingoLin-go/internal/service"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// 加载 .env 文件（可选）
	_ = godotenv.Load()

	// 加载配置
	cfg := config.Load()

	// 确保存储目录存在
	if err := cfg.EnsureDirs(); err != nil {
		log.Fatalf("初始化目录失败: %v", err)
	}

	// 初始化数据库
	db := repository.InitDB(cfg)

	// 自动迁移
	if err := db.AutoMigrate(&model.User{}, &model.ApiKey{}, &model.FileRecord{}); err != nil {
		log.Fatalf("数据库迁移失败: %v", err)
	}

	// 初始化数据访问层
	userRepo := repository.NewUserRepo(db)
	apiKeyRepo := repository.NewApiKeyRepo(db)
	fileRecordRepo := repository.NewFileRecordRepo(db)

	// 初始化业务逻辑层
	authSvc := service.NewAuthService(userRepo, cfg.JWTSecret)
	apiKeySvc := service.NewApiKeyService(apiKeyRepo)
	fileSvc := service.NewFileService(cfg.StorePath, fileRecordRepo)

	// 确保默认管理员账号存在
	authSvc.EnsureDefaultAdmin(cfg.DefaultAdminPassword)

	// 初始化处理器
	authHandler := handler.NewAuthHandler(authSvc)
	apiKeyHandler := handler.NewApiKeyHandler(apiKeySvc)
	fileHandler := handler.NewFileHandler(fileSvc)

	// 初始化路由
	r := gin.Default()

	// CORS 中间件（开发环境允许所有来源）
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}))

	// ========== 公开路由 ==========
	r.POST("/api/auth/register", authHandler.Register)
	r.POST("/api/auth/login", authHandler.Login)

	// ========== JWT 认证路由（管理端） ==========
	admin := r.Group("/api/admin")
	admin.Use(middleware.JWTAuth(authSvc))
	{
		admin.GET("/keys", apiKeyHandler.List)
		admin.POST("/keys", apiKeyHandler.Create)
		admin.PUT("/keys/:id", apiKeyHandler.Update)
		admin.DELETE("/keys/:id", apiKeyHandler.Delete)
	}

	// ========== API Key 认证路由（文件操作） ==========
	file := r.Group("/api/files")
	file.Use(middleware.ApiKeyAuth(apiKeySvc))
	{
		file.GET("/list", fileHandler.List)
		file.POST("/upload", fileHandler.Upload)
		file.GET("/download", fileHandler.Download)
		file.GET("/preview", fileHandler.Preview)
		file.POST("/mkdir", fileHandler.Mkdir)
		file.DELETE("/remove", fileHandler.Remove)
		file.GET("/permissions", fileHandler.MyPermissions)
	}

	// 启动服务器
	log.Printf("╔══════════════════════════════════╗")
	log.Printf("║  LingoLin 文件服务启动成功        ║")
	log.Printf("║  端口: %s                        ║", cfg.Port)
	log.Printf("║  存储: %s                        ║", cfg.StorePath)
	log.Printf("╚══════════════════════════════════╝")
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("服务端启动失败: %v", err)
	}
}
