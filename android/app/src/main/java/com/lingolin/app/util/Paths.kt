package com.lingolin.app.util

/** 服务端路径一律 Unix 风格 "/" 分隔，这里统一做拼接与切分 */
object Paths {

    fun join(dir: String, name: String): String {
        if (dir == "/") return "/$name"
        return "${dir.trimEnd('/')}/$name"
    }

    fun segments(path: String): List<String> = path.split("/").filter { it.isNotEmpty() }

    /** 第 index 级面包屑对应的完整路径（用于点击跳转） */
    fun segmentPath(path: String, index: Int): String {
        val segs = segments(path)
        if (index >= segs.size) return path
        return "/" + segs.take(index + 1).joinToString("/")
    }
}
