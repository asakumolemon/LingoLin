package handler

import (
	"net"
	"strings"

	"LingoLin-go/internal/config"

	"github.com/gin-gonic/gin"
)

// ConfigHandler 提供服务端对外可达地址等信息，供 Web 面板生成分享连接
type ConfigHandler struct {
	cfg *config.Config
}

func NewConfigHandler(cfg *config.Config) *ConfigHandler {
	return &ConfigHandler{cfg: cfg}
}

// Config 返回服务端连接信息：
//   - public_url：管理员通过 PUBLIC_URL 显式配置的对外地址（可为空）
//   - lan_ip：服务端探测到的局域网 IPv4（裸机部署时的默认值，可为空）
//   - port：服务监听端口
func (h *ConfigHandler) Config(c *gin.Context) {
	Success(c, gin.H{
		"public_url": h.cfg.PublicURL,
		"lan_ip":     detectLANIP(),
		"port":       h.cfg.Port,
	})
}

// detectLANIP 探测首个非回环、非链路本地的 IPv4 地址。
// 注意：Docker 容器内探测到的是容器 IP，并非宿主机 IP，此时应配置 PUBLIC_URL。
func detectLANIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return ""
	}
	for _, addr := range addrs {
		var ip net.IP
		switch v := addr.(type) {
		case *net.IPNet:
			ip = v.IP
		case *net.IPAddr:
			ip = v.IP
		}
		if ip == nil || ip.IsLoopback() || ip.To4() == nil {
			continue
		}
		s := ip.String()
		if strings.HasPrefix(s, "169.254.") {
			continue // 链路本地地址，客户端不可达
		}
		return s
	}
	return ""
}
