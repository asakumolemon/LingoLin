package com.lingolin.app.ui.files

import android.content.ContentResolver
import android.net.Uri
import android.provider.OpenableColumns
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lingolin.app.data.model.FileItem
import com.lingolin.app.data.model.KeyPermission
import com.lingolin.app.data.repository.FileRepository
import com.lingolin.app.util.Paths
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.OutputStream
import java.time.Instant

enum class SortField { NAME, SIZE, UPDATED_AT }
enum class SortDir { ASC, DESC }

data class UploadState(
    val id: Int,
    val name: String,
    val total: Long,
    val sent: Long,
    val done: Boolean = false,
    val error: String? = null
)

data class DownloadProgress(val name: String, val sent: Long, val total: Long)

data class FileBrowserUiState(
    val currentPath: String = "/",
    val items: List<FileItem> = emptyList(),
    val loading: Boolean = false,
    val error: String? = null,
    val sortField: SortField = SortField.NAME,
    val sortDir: SortDir = SortDir.ASC,
    val searchQuery: String = "",
    val permission: KeyPermission? = null,
    val uploads: List<UploadState> = emptyList(),
    val previewItem: FileItem? = null,
    val deleteTarget: FileItem? = null,
    val showNewFolder: Boolean = false,
    val downloadProgress: DownloadProgress? = null,
    val snackbarMessage: String? = null
)

class FileBrowserViewModel(private val repository: FileRepository) : ViewModel() {

    private val _state = MutableStateFlow(FileBrowserUiState())
    val state: StateFlow<FileBrowserUiState> = _state.asStateFlow()

    private var nextUploadId = 0

    init {
        loadPermission()
        load("/")
    }

    /** 权限获取失败不阻断列表（仅影响按钮显隐） */
    fun loadPermission() {
        viewModelScope.launch {
            try {
                val p = repository.testAndGetPermission()
                _state.update { it.copy(permission = p) }
            } catch (_: Exception) {
            }
        }
    }

    fun load(path: String) {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            try {
                val resp = repository.list(path)
                _state.update { it.copy(loading = false, currentPath = resp.path, items = resp.items) }
            } catch (e: Exception) {
                _state.update { it.copy(loading = false, error = e.message ?: "加载失败") }
            }
        }
    }

    fun navigate(path: String) = load(path)

    fun toggleSort(field: SortField) {
        _state.update { s ->
            if (s.sortField == field) {
                s.copy(sortDir = if (s.sortDir == SortDir.ASC) SortDir.DESC else SortDir.ASC)
            } else {
                // 切到 size/updated_at 默认降序，name 默认升序（对齐 desktop）
                s.copy(sortField = field, sortDir = if (field == SortField.NAME) SortDir.ASC else SortDir.DESC)
            }
        }
    }

    fun onSearchChange(query: String) = _state.update { it.copy(searchQuery = query) }

    fun setPreview(item: FileItem?) = _state.update { it.copy(previewItem = item) }
    fun setDeleteTarget(item: FileItem?) = _state.update { it.copy(deleteTarget = item) }
    fun setShowNewFolder(show: Boolean) = _state.update { it.copy(showNewFolder = show) }

    fun createFolder(name: String) {
        val trimmed = name.trim()
        if (trimmed.isEmpty() || trimmed.contains('/') || trimmed.contains('\\')) {
            showMessage("文件夹名称无效")
            setShowNewFolder(false)
            return
        }
        viewModelScope.launch {
            try {
                repository.mkdir(Paths.join(_state.value.currentPath, trimmed))
                load(_state.value.currentPath)
            } catch (e: Exception) {
                showMessage(e.message ?: "创建失败")
            }
            setShowNewFolder(false)
        }
    }

    fun delete() {
        val target = _state.value.deleteTarget ?: return
        viewModelScope.launch {
            try {
                repository.remove(target.path)
                load(_state.value.currentPath)
            } catch (e: Exception) {
                showMessage(e.message ?: "删除失败")
            }
            setDeleteTarget(null)
        }
    }

    /** 串行逐文件上传，进度实时更新；完成自动刷新列表 */
    fun upload(uris: List<Uri>, resolver: ContentResolver) {
        if (uris.isEmpty()) return
        if (!(_state.value.permission?.write ?: true)) {
            showMessage("当前密钥无写入权限")
            return
        }
        val targetDir = _state.value.currentPath
        viewModelScope.launch {
            for (uri in uris) {
                val name = queryName(resolver, uri)
                val size = querySize(resolver, uri)
                if (size > MAX_UPLOAD_SIZE) {
                    showMessage("文件 $name 超过 100MB 限制")
                    continue
                }
                val id = nextUploadId++
                addUpload(UploadState(id, name, size, 0))
                try {
                    val stream = resolver.openInputStream(uri)
                        ?: throw IllegalStateException("无法打开文件")
                    stream.use { input ->
                        repository.upload(name, input, size, Paths.join(targetDir, name)) { sent, total ->
                            updateUpload(id) {
                                it.copy(sent = sent, total = if (total >= 0) total else it.total)
                            }
                        }
                    }
                    updateUpload(id) { it.copy(done = true) }
                } catch (e: Exception) {
                    updateUpload(id) { it.copy(done = true, error = e.message ?: "上传失败") }
                }
            }
            load(targetDir)
        }
    }

    /** 流式下载到指定 OutputStream（SAF 已创建目标文档），完成提示 */
    fun download(item: FileItem, out: OutputStream) {
        viewModelScope.launch {
            _state.update { it.copy(downloadProgress = DownloadProgress(item.name, 0, 0)) }
            try {
                repository.download(item.path, out) { sent, total ->
                    _state.update { s ->
                        s.copy(downloadProgress = DownloadProgress(item.name, sent, total))
                    }
                }
                showMessage("已保存")
            } catch (e: Exception) {
                showMessage(e.message ?: "下载失败")
            } finally {
                _state.update { it.copy(downloadProgress = null) }
            }
        }
    }

    suspend fun readPreviewText(item: FileItem): String = repository.readPreviewText(item.path)

    /** 图片预览 URL（供 Coil 使用，token 走查询参数） */
    fun previewUrl(path: String): String = repository.previewUrl(path)

    fun dismissSnackbar() = _state.update { it.copy(snackbarMessage = null) }

    private fun addUpload(u: UploadState) = _state.update { it.copy(uploads = it.uploads + u) }

    private fun updateUpload(id: Int, transform: (UploadState) -> UploadState) =
        _state.update { s ->
            s.copy(uploads = s.uploads.map { if (it.id == id) transform(it) else it })
        }

    private fun showMessage(msg: String) = _state.update { it.copy(snackbarMessage = msg) }

    private fun queryName(resolver: ContentResolver, uri: Uri): String {
        resolver.query(uri, null, null, null, null)?.use { c ->
            val idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (idx >= 0 && c.moveToFirst()) {
                c.getString(idx)?.takeIf { it.isNotBlank() }?.let { return it }
            }
        }
        return uri.lastPathSegment ?: "file"
    }

    private fun querySize(resolver: ContentResolver, uri: Uri): Long {
        resolver.query(uri, null, null, null, null)?.use { c ->
            val idx = c.getColumnIndex(OpenableColumns.SIZE)
            if (idx >= 0 && c.moveToFirst() && !c.isNull(idx)) {
                return c.getLong(idx)
            }
        }
        return -1L // 未知大小：跳过客户端预检，由服务端 MaxBytesReader 兜底
    }

    companion object {
        const val MAX_UPLOAD_SIZE = 100L * 1024 * 1024
    }
}

/**
 * 客户端排序 + 搜索：目录恒在文件前；按字段排序（升降序仅作用于字段内）。
 */
fun filterAndSort(
    items: List<FileItem>,
    query: String,
    field: SortField,
    dir: SortDir
): List<FileItem> {
    val q = query.trim().lowercase()
    val filtered = if (q.isEmpty()) items else items.filter { it.name.lowercase().contains(q) }
    val fieldComparator: Comparator<FileItem> = when (field) {
        SortField.NAME -> compareBy { it.name.lowercase() }
        SortField.SIZE -> compareBy { it.size }
        SortField.UPDATED_AT -> compareBy {
            try {
                Instant.parse(it.updatedAt).toEpochMilli()
            } catch (_: Exception) {
                0L
            }
        }
    }
    val effective = if (dir == SortDir.DESC) fieldComparator.reversed() else fieldComparator
    return filtered.sortedWith(compareBy<FileItem> { it.isDir }.then(effective))
}
