package com.lingolin.app.data.model

import com.google.gson.annotations.SerializedName

/**
 * 服务端统一响应包：{ code, message, data }
 * code == 0 表示成功。
 */
data class ApiResponse<T>(
    val code: Int = 0,
    val message: String = "",
    val data: T? = null
)

/** API Key 权限信息（GET /api/files/permissions） */
data class KeyPermission(
    @SerializedName("allow_paths") val allowPaths: List<String> = emptyList(),
    val read: Boolean = false,
    val write: Boolean = false
)

/** 文件/目录条目 */
data class FileItem(
    val name: String = "",
    val path: String = "",
    val type: String = "",          // "file" | "dir"
    val size: Long = 0,
    @SerializedName("mime_type") val mimeType: String = "",
    @SerializedName("updated_at") val updatedAt: String? = null
) {
    val isDir: Boolean get() = type == "dir"
}

/** 列目录响应 */
data class ListResp(
    val path: String = "/",
    val items: List<FileItem> = emptyList()
)

/** 新建文件夹请求体 */
data class MkdirReq(val path: String)
