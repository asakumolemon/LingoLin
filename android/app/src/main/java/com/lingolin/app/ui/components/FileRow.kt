package com.lingolin.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import com.lingolin.app.data.model.FileItem
import com.lingolin.app.ui.theme.Blue500
import com.lingolin.app.util.Format

/**
 * 文件/目录行：点击打开（目录导航 / 文件预览），溢出菜单提供 预览/下载/删除。
 */
@Composable
fun FileRow(
    item: FileItem,
    canWrite: Boolean,
    onOpen: (FileItem) -> Unit,
    onDownload: (FileItem) -> Unit,
    onDelete: (FileItem) -> Unit
) {
    var menuExpanded by remember { mutableStateOf(false) }

    ListItem(
        modifier = Modifier.clickable { onOpen(item) },
        leadingContent = {
            Icon(
                imageVector = if (item.isDir) Icons.Filled.Folder else Icons.Filled.Description,
                contentDescription = null,
                tint = if (item.isDir) Blue500 else MaterialTheme.colorScheme.onSurfaceVariant
            )
        },
        headlineContent = {
            Text(item.name, maxLines = 1, overflow = TextOverflow.Ellipsis)
        },
        supportingContent = {
            Text(
                if (item.isDir) "目录" else "${Format.size(item.size)} · ${Format.time(item.updatedAt)}"
            )
        },
        trailingContent = {
            Box {
                IconButton(onClick = { menuExpanded = true }) {
                    Icon(Icons.Filled.MoreVert, contentDescription = "操作")
                }
                DropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }) {
                    if (!item.isDir) {
                        DropdownMenuItem(
                            text = { Text("预览") },
                            leadingIcon = { Icon(Icons.Filled.Visibility, null) },
                            onClick = { menuExpanded = false; onOpen(item) }
                        )
                        DropdownMenuItem(
                            text = { Text("下载") },
                            leadingIcon = { Icon(Icons.Filled.Download, null) },
                            onClick = { menuExpanded = false; onDownload(item) }
                        )
                    }
                    if (canWrite) {
                        DropdownMenuItem(
                            text = { Text("删除", color = MaterialTheme.colorScheme.error) },
                            leadingIcon = { Icon(Icons.Filled.Delete, null, tint = MaterialTheme.colorScheme.error) },
                            onClick = { menuExpanded = false; onDelete(item) }
                        )
                    }
                }
            }
        }
    )
}
