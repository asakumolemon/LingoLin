package middleware

import (
	"net/http"
	"strings"

	"LingoLin-go/internal/handler"
	"LingoLin-go/internal/service"

	"github.com/gin-gonic/gin"
)

// JWTAuth JWT 认证中间件（Web 管理端使用）
func JWTAuth(authSvc *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := extractToken(c)
		if tokenString == "" {
			handler.Error(c, http.StatusUnauthorized, handler.CodeUnauthorized, "缺少认证 Token")
			c.Abort()
			return
		}

		userID, username, role, err := authSvc.ValidateJWT(tokenString)
		if err != nil {
			handler.Error(c, http.StatusUnauthorized, handler.CodeUnauthorized, "Token 无效或已过期")
			c.Abort()
			return
		}

		// 将用户信息存入上下文
		c.Set("user_id", userID)
		c.Set("username", username)
		c.Set("role", role)
		c.Next()
	}
}

// ApiKeyAuth API 密钥认证中间件（客户端使用）
func ApiKeyAuth(apiKeySvc *service.ApiKeyService) gin.HandlerFunc {
	return func(c *gin.Context) {
		keyString := extractToken(c)
		if keyString == "" {
			handler.Error(c, http.StatusUnauthorized, handler.CodeUnauthorized, "缺少 API Key")
			c.Abort()
			return
		}

		apiKey, err := apiKeySvc.ValidateKey(keyString)
		if err != nil {
			handler.Error(c, http.StatusUnauthorized, handler.CodeUnauthorized, err.Error())
			c.Abort()
			return
		}

		// 将密钥信息存入上下文（handler 中做路径权限校验）
		c.Set("api_key_id", apiKey.ID)
		c.Set("api_key_permissions", apiKey.Permissions)
		c.Next()
	}
}

// extractToken 从请求头中提取 Bearer Token
func extractToken(c *gin.Context) string {
	auth := c.GetHeader("Authorization")
	if auth == "" {
		// 也支持从查询参数获取（方便某些客户端）
		return c.Query("token")
	}

	parts := strings.SplitN(auth, " ", 2)
	if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
		return parts[1]
	}
	return auth
}
