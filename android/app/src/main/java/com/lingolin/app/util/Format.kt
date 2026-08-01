package com.lingolin.app.util

import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/** 文件大小 / 时间格式化，与 desktop 端逻辑对齐 */
object Format {

    private val timeFormatter =
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneId.systemDefault())

    fun size(bytes: Long): String {
        if (bytes < 1024) return "$bytes B"
        val kb = bytes / 1024.0
        if (kb < 1024) return String.format("%.1f KB", kb)
        val mb = kb / 1024
        if (mb < 1024) return String.format("%.1f MB", mb)
        val gb = mb / 1024
        return String.format("%.1f GB", gb)
    }

    fun time(updatedAt: String?): String {
        if (updatedAt.isNullOrBlank()) return ""
        return try {
            timeFormatter.format(Instant.parse(updatedAt))
        } catch (_: Exception) {
            updatedAt
        }
    }

    fun percent(sent: Long, total: Long): Float =
        if (total <= 0) 0f else (sent.toFloat() / total).coerceIn(0f, 1f)
}
