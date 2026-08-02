package com.lingolin.app.data.model

/** 本地保存的服务端连接配置。API Key 与配置本身一起存放在加密偏好中。 */
data class ConnectionConfig(
    val id: String,
    val name: String,
    val baseUrl: String,
    val apiKey: String
) {
    val maskedApiKey: String
        get() = apiKey.take(20) + if (apiKey.length > 20) "…" else ""
}
