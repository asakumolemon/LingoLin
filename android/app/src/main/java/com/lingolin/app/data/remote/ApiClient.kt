package com.lingolin.app.data.remote

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.lingolin.app.data.local.ConfigStore
import com.lingolin.app.data.model.ApiResponse
import com.lingolin.app.data.model.FileItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okio.BufferedSink
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

/**
 * OkHttp + Gson 手写薄封装。
 * 服务端仅 7 个接口、统一响应包；上传/下载需要流式与进度，手写封装完全可控。
 */
class ApiClient(private val config: ConfigStore) {

    private val gson = Gson()

    private val okHttp = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .writeTimeout(120, TimeUnit.SECONDS)
        .build()

    private val baseUrl: String get() = config.baseUrl ?: ""
    private val apiKey: String get() = config.apiKey ?: ""

    // ---------- JSON 请求 ----------

    /** 发起 JSON 请求并反序列化 data；code != 0 抛 ApiException */
    suspend fun <T> requestJson(
        path: String,
        method: String = "GET",
        body: Any? = null,
        dataType: Class<T>
    ): T = withContext(Dispatchers.IO) {
        val respBody = execute(path, method, body)
        val env = gson.fromJson(respBody, RawEnvelope::class.java) ?: RawEnvelope(0, "success")
        if (env.code != 0) throw ApiException(env.code, env.message)
        val responseType = TypeToken.getParameterized(ApiResponse::class.java, dataType).type
        val response: ApiResponse<T>? = gson.fromJson(respBody, responseType)
        response?.data ?: throw ApiException(-1, "响应格式错误")
    }

    /** 无需返回 data 的请求（如删除），只校验响应 code */
    suspend fun request(path: String, method: String = "GET", body: Any? = null): Unit =
        withContext(Dispatchers.IO) {
            val respBody = execute(path, method, body)
            val env = gson.fromJson(respBody, RawEnvelope::class.java) ?: RawEnvelope(0, "success")
            if (env.code != 0) throw ApiException(env.code, env.message)
        }

    private fun execute(path: String, method: String, body: Any?): String {
        val builder = Request.Builder()
            .url(buildUrl(path))
            .header("Authorization", "Bearer $apiKey")
        if (body != null) {
            val json = gson.toJson(body)
            builder.method(method, json.toRequestBody("application/json; charset=utf-8".toMediaType()))
        } else {
            builder.method(method, null)
        }
        return try {
            okHttp.newCall(builder.build()).execute().use { resp ->
                val respBody = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) {
                    val code = parseCode(respBody) ?: resp.code
                    val message = parseMessage(respBody) ?: "请求失败 (HTTP ${resp.code})"
                    throw ApiException(code, message)
                }
                respBody
            }
        } catch (e: ApiException) {
            throw e
        } catch (e: IOException) {
            throw ApiException(-1, "网络连接失败：${e.message}")
        }
    }

    // ---------- 上传 ----------

    /** 流式 multipart 上传，带进度回调 */
    suspend fun upload(
        displayName: String,
        inputStream: InputStream,
        size: Long,
        targetPath: String,
        onProgress: (sent: Long, total: Long) -> Unit
    ): FileItem = withContext(Dispatchers.IO) {
        val body = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("file", displayName, ProgressRequestBody(inputStream, size, onProgress))
            .addFormDataPart("path", targetPath)
            .build()
        val request = Request.Builder()
            .url(buildUrl("/api/files/upload"))
            .header("Authorization", "Bearer $apiKey")
            .post(body)
            .build()
        try {
            okHttp.newCall(request).execute().use { resp ->
                val respBody = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) {
                    val code = parseCode(respBody) ?: resp.code
                    val message = parseMessage(respBody) ?: "上传失败 (HTTP ${resp.code})"
                    throw ApiException(code, message)
                }
                val env = gson.fromJson(respBody, RawEnvelope::class.java) ?: RawEnvelope(0, "success")
                if (env.code != 0) throw ApiException(env.code, env.message)
                val response: ApiResponse<FileItem>? = gson.fromJson(respBody, FILE_ITEM_RESPONSE)
                response?.data ?: throw ApiException(-1, "上传响应格式错误")
            }
        } catch (e: ApiException) {
            throw e
        } catch (e: IOException) {
            throw ApiException(-1, "网络连接失败：${e.message}")
        }
    }

    // ---------- 下载 / 预览 ----------

    /** 流式下载到 OutputStream，带进度回调 */
    suspend fun downloadTo(
        path: String,
        out: OutputStream,
        onProgress: (sent: Long, total: Long) -> Unit
    ): Unit = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url(buildUrl("/api/files/download?path=$path"))
            .header("Authorization", "Bearer $apiKey")
            .get()
            .build()
        try {
            okHttp.newCall(request).execute().use { resp ->
                if (!resp.isSuccessful) {
                    val message = parseMessage(resp.body?.string()) ?: "下载失败 (HTTP ${resp.code})"
                    throw ApiException(resp.code, message)
                }
                val body = resp.body ?: throw ApiException(-1, "下载失败")
                val total = body.contentLength()
                body.byteStream().use { input -> copyStream(input, out, total, onProgress) }
                out.flush()
            }
        } catch (e: ApiException) {
            throw e
        } catch (e: IOException) {
            throw ApiException(-1, "网络连接失败：${e.message}")
        }
    }

    /** 读取文本预览内容（限长防 OOM） */
    suspend fun readPreviewText(path: String, maxBytes: Int = MAX_PREVIEW_BYTES): String =
        withContext(Dispatchers.IO) {
            val request = Request.Builder()
                .url(buildUrl("/api/files/preview?path=$path"))
                .header("Authorization", "Bearer $apiKey")
                .get()
                .build()
            try {
                okHttp.newCall(request).execute().use { resp ->
                    if (!resp.isSuccessful) {
                        val message = parseMessage(resp.body?.string()) ?: "无法读取文件内容 (HTTP ${resp.code})"
                        throw ApiException(resp.code, message)
                    }
                    val input = resp.body?.byteStream()
                        ?: throw ApiException(-1, "无法读取文件内容")
                    // 手动有界读取，兼容低版本 Android
                    val buffer = ByteArray(maxBytes)
                    var total = 0
                    while (total < maxBytes) {
                        val n = input.read(buffer, total, maxBytes - total)
                        if (n == -1) break
                        total += n
                    }
                    String(buffer, 0, total, Charsets.UTF_8)
                }
            } catch (e: ApiException) {
                throw e
            } catch (e: IOException) {
                throw ApiException(-1, "网络连接失败：${e.message}")
            }
        }

    /** 图片预览 URL —— Coil 无法带请求头，token 走查询参数（服务端 extractToken 兼容） */
    fun previewUrl(path: String): String {
        val p = URLEncoder.encode(path, "UTF-8")
        val k = URLEncoder.encode(apiKey, "UTF-8")
        return "$baseUrl/api/files/preview?path=$p&token=$k"
    }

    // ---------- 内部工具 ----------

    /** 拼接 baseUrl + path，并正确处理查询参数编码 */
    private fun buildUrl(path: String): HttpUrl {
        val base = try {
            baseUrl.toHttpUrl()
        } catch (e: IllegalArgumentException) {
            throw ApiException(-1, "服务器地址无效")
        }
        val builder = base.newBuilder()
        val qIndex = path.indexOf('?')
        val pathPart = if (qIndex >= 0) path.substring(0, qIndex) else path
        val queryPart = if (qIndex >= 0) path.substring(qIndex + 1) else ""
        pathPart.removePrefix("/").split("/").filter { it.isNotEmpty() }
            .forEach { builder.addPathSegment(it) }
        if (queryPart.isNotEmpty()) {
            queryPart.split("&").forEach { pair ->
                val eq = pair.indexOf('=')
                if (eq >= 0) builder.addQueryParameter(pair.substring(0, eq), pair.substring(eq + 1))
                else builder.addQueryParameter(pair, "")
            }
        }
        return builder.build()
    }

    private fun parseCode(body: String?): Int? =
        try {
            gson.fromJson(body, RawEnvelope::class.java)?.code
        } catch (_: Exception) {
            null
        }

    private fun parseMessage(body: String?): String? =
        try {
            gson.fromJson(body, RawEnvelope::class.java)?.message
        } catch (_: Exception) {
            null
        }

    private class RawEnvelope(val code: Int = 0, val message: String = "")

    private companion object {
        const val MAX_PREVIEW_BYTES = 2 * 1024 * 1024
        val FILE_ITEM_RESPONSE: TypeToken<ApiResponse<FileItem>> =
            object : TypeToken<ApiResponse<FileItem>>() {}
    }
}

/** 上传请求体：从 InputStream 流式读取并上报进度 */
class ProgressRequestBody(
    private val input: InputStream,
    private val length: Long,
    private val onProgress: (sent: Long, total: Long) -> Unit
) : RequestBody() {

    override fun contentType(): okhttp3.MediaType? =
        "application/octet-stream".toMediaType()

    override fun contentLength(): Long = if (length >= 0) length else -1L

    override fun writeTo(sink: BufferedSink) {
        val buffer = ByteArray(64 * 1024)
        var sent = 0L
        while (true) {
            val n = input.read(buffer)
            if (n == -1) break
            sink.write(buffer, 0, n)
            sent += n
            onProgress(sent, length)
        }
    }
}

private fun copyStream(
    input: InputStream,
    out: OutputStream,
    total: Long,
    onProgress: (sent: Long, total: Long) -> Unit
) {
    val buffer = ByteArray(64 * 1024)
    var sent = 0L
    while (true) {
        val n = input.read(buffer)
        if (n == -1) break
        out.write(buffer, 0, n)
        sent += n
        onProgress(sent, total)
    }
}
