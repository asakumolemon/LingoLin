package com.lingolin.app.data.repository

import com.lingolin.app.data.local.ConfigStore
import com.lingolin.app.data.model.FileItem
import com.lingolin.app.data.model.KeyPermission
import com.lingolin.app.data.model.ListResp
import com.lingolin.app.data.remote.ApiClient
import java.io.InputStream
import java.io.OutputStream

/**
 * 仓库层：组合 remote + local，向上层只暴露挂起函数，ViewModel 不感知网络细节。
 */
class FileRepository(
    private val api: ApiClient,
    private val config: ConfigStore
) {
    // 配置读写
    val baseUrl: String get() = config.baseUrl ?: ""
    val apiKey: String get() = config.apiKey ?: ""
    val isConfigured: Boolean get() = config.isConfigured
    fun saveConfig(url: String, key: String) {
        config.baseUrl = url
        config.apiKey = key
    }
    fun clearConfig() = config.clear()

    // 权限
    suspend fun testAndGetPermission(): KeyPermission =
        api.requestJson("/api/files/permissions", dataType = KeyPermission::class.java)

    // 文件
    suspend fun list(path: String): ListResp =
        api.requestJson("/api/files/list?path=$path", dataType = ListResp::class.java)

    suspend fun mkdir(path: String): FileItem =
        api.requestJson("/api/files/mkdir", method = "POST", body = MkdirReqBody(path), dataType = FileItem::class.java)

    suspend fun remove(path: String): Unit =
        api.request("/api/files/remove?path=$path", method = "DELETE")

    suspend fun upload(
        name: String,
        stream: InputStream,
        size: Long,
        targetPath: String,
        overwrite: Boolean,
        onProgress: (sent: Long, total: Long) -> Unit
    ): FileItem = api.upload(name, stream, size, targetPath, overwrite, onProgress)

    suspend fun download(
        path: String,
        out: OutputStream,
        onProgress: (sent: Long, total: Long) -> Unit
    ): Unit = api.downloadTo(path, out, onProgress)

    suspend fun readPreviewText(path: String): String = api.readPreviewText(path)

    fun previewUrl(path: String): String = api.previewUrl(path)

    private data class MkdirReqBody(val path: String)
}
