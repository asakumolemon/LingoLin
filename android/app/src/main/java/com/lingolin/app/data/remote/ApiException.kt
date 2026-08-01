package com.lingolin.app.data.remote

/**
 * API 异常，携带服务端错误码与提示。
 * 错误码对照服务端：40001 参数 / 40002 认证 / 40003 权限 / 40004 不存在 /
 * 40005 已存在 / 40006 文件操作失败 / 50001 内部错误；-1 为本地网络错误。
 */
class ApiException(val code: Int, message: String) : Exception(message) {
    /** 认证失败时提示用户重新连接 */
    val isAuthError: Boolean get() = code == 40002 || code == 401
}
