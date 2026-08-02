package com.lingolin.app.ui.files

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.lingolin.app.data.model.FileItem
import com.lingolin.app.ui.components.ConfirmDialog

private const val MAX_EDIT_BYTES = 2 * 1024 * 1024

@Composable
fun PreviewDialog(
    item: FileItem,
    vm: FileBrowserViewModel,
    canWrite: Boolean,
    onDismiss: () -> Unit
) {
    var content by remember(item.path) { mutableStateOf<String?>(null) }
    var error by remember(item.path) { mutableStateOf<String?>(null) }
    var editing by remember(item.path) { mutableStateOf(false) }
    var editorText by remember(item.path) { mutableStateOf("") }
    var savedText by remember(item.path) { mutableStateOf("") }
    var loadingEdit by remember(item.path) { mutableStateOf(false) }
    var saving by remember(item.path) { mutableStateOf(false) }
    var showDiscard by remember(item.path) { mutableStateOf(false) }

    LaunchedEffect(item.path) {
        content = null
        error = null
        try { content = vm.readPreviewText(item) }
        catch (e: Exception) { error = e.message ?: "无法读取文件内容" }
    }

    fun requestClose() {
        if (editing && editorText != savedText) showDiscard = true else onDismiss()
    }

    Dialog(onDismissRequest = ::requestClose) {
        Surface(shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth().fillMaxHeight(0.8f).imePadding()) {
            Column(Modifier.fillMaxSize()) {
                Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 4.dp, top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(item.name, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                    if (isText(item.mimeType) && canWrite && !editing) {
                        TextButton(
                            enabled = !loadingEdit && item.size <= MAX_EDIT_BYTES,
                            onClick = {
                                loadingEdit = true
                                error = null
                            }
                        ) { Text(if (item.size <= MAX_EDIT_BYTES) "编辑" else "超过 2MB，不可编辑") }
                    }
                    if (editing) {
                        TextButton(enabled = !saving, onClick = { editing = false; editorText = savedText }) { Text("取消") }
                        Button(enabled = !saving && editorText != savedText, onClick = {
                            saving = true
                        }) { Text("保存") }
                    }
                    IconButton(enabled = !saving, onClick = ::requestClose) { Icon(Icons.Filled.Close, contentDescription = "关闭") }
                }
                if (loadingEdit) {
                    LaunchedEffect(item.path, loadingEdit) {
                        try {
                            val text = vm.readEditableText(item)
                            editorText = text
                            savedText = text
                            editing = true
                        } catch (e: Exception) { error = e.message ?: "文件不是有效的 UTF-8 文本" }
                        finally { loadingEdit = false }
                    }
                }
                if (saving) {
                    LaunchedEffect(item.path, saving, editorText) {
                        try {
                            vm.saveTextContent(item, editorText)
                            savedText = editorText
                            content = editorText
                            editing = false
                        } catch (e: Exception) { error = e.message ?: "保存失败" }
                        finally { saving = false }
                    }
                }
                Box(Modifier.fillMaxSize()) {
                    when {
                        error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(error.orEmpty()) }
                        isImage(item.mimeType) -> AsyncImage(
                            model = ImageRequest.Builder(LocalContext.current).data(vm.previewUrl(item.path)).crossfade(true).build(),
                            contentDescription = item.name, contentScale = ContentScale.Fit, modifier = Modifier.fillMaxSize()
                        )
                        editing -> OutlinedTextField(
                            value = editorText,
                            onValueChange = { editorText = it },
                            textStyle = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                            modifier = Modifier.fillMaxSize().padding(12.dp),
                            maxLines = Int.MAX_VALUE
                        )
                        content == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                        else -> Text(content.orEmpty(), style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace), modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp))
                    }
                }
            }
        }
    }

    if (showDiscard) {
        ConfirmDialog(
            title = "放弃修改？",
            message = "当前内容尚未保存，确定关闭吗？",
            confirmText = "放弃",
            onConfirm = { showDiscard = false; onDismiss() },
            onDismiss = { showDiscard = false }
        )
    }
}

private fun isImage(mime: String): Boolean = mime.startsWith("image/")
private fun isText(mime: String): Boolean = mime.startsWith("text/") || mime in setOf("application/json", "application/xml", "application/javascript", "application/yaml", "application/x-yaml")
