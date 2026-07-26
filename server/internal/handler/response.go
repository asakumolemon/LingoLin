package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{Code: 0, Message: "success", Data: data})
}

func Error(c *gin.Context, httpCode, code int, msg string) {
	c.JSON(httpCode, Response{Code: code, Message: msg, Data: nil})
}

const (
	CodeSuccess       = 0
	CodeBadRequest    = 40001
	CodeUnauthorized  = 40002
	CodeForbidden     = 40003
	CodeNotFound      = 40004
	CodeAlreadyExists = 40005
	CodeFileError     = 40006
	CodeInternalError = 50001
)
