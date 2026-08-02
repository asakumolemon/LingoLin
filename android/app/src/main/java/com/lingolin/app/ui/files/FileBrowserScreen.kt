package com.lingolin.app.ui.files

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.CreateNewFolder
import androidx.compose.material.icons.filled.FileUpload
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.lingolin.app.AppGraph
import com.lingolin.app.data.model.FileItem
import com.lingolin.app.ui.components.BreadcrumbBar
import com.lingolin.app.ui.components.ConfirmDialog
import com.lingolin.app.ui.components.ErrorBanner
import com.lingolin.app.ui.components.FileRow
import com.lingolin.app.util.Format

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FileBrowserScreen() {
    val vm: FileBrowserViewModel = viewModel { FileBrowserViewModel(AppGraph.repository) }
    val state by vm.state.collectAsState()
    val context = LocalContext.current

    // 上传：SAF 多选文件
    val uploadLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenMultipleDocuments()
    ) { uris ->
        if (!uris.isNullOrEmpty()) vm.upload(uris, context.contentResolver)
    }

    // 下载：SAF 创建文档（带默认文件名）
    var pendingDownload by remember { mutableStateOf<FileItem?>(null) }
    val saveLauncher = rememberLauncherForActivityResult(CreateDocumentWithTitle()) { uri ->
        val item = pendingDownload ?: return@rememberLauncherForActivityResult
        pendingDownload = null
        if (uri != null) {
            context.contentResolver.openOutputStream(uri)?.use { out ->
                vm.download(item, out)
            }
        }
    }

    // 提示条
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(state.snackbarMessage) {
        state.snackbarMessage?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            vm.dismissSnackbar()
        }
    }

    val canWrite = state.permission?.write ?: true
    val canRead = state.permission?.read ?: true

    // read=false 时隐藏文件条目（服务端也只会返回自己上传的文件，这里再加一道）
    val readableItems = remember(state.items, canRead) {
        if (canRead) state.items else state.items.filter { it.isDir }
    }
    val visibleItems = remember(readableItems, state.sortField, state.sortDir, state.searchQuery) {
        filterAndSort(readableItems, state.searchQuery, state.sortField, state.sortDir)
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text(state.currentPath, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                actions = {
                    if (canWrite) {
                        IconButton(onClick = { vm.setShowNewFolder(true) }) {
                            Icon(Icons.Filled.CreateNewFolder, contentDescription = "新建文件夹")
                        }
                        IconButton(onClick = { uploadLauncher.launch(arrayOf("*/*")) }) {
                            Icon(Icons.Filled.FileUpload, contentDescription = "上传")
                        }
                    }
                    IconButton(onClick = { vm.load(state.currentPath) }) {
                        Icon(Icons.Filled.Refresh, contentDescription = "刷新")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            BreadcrumbBar(state.currentPath, onNavigate = vm::navigate)

            // 排序 + 搜索
            var sortMenuExpanded by remember { mutableStateOf(false) }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box {
                    FilterChip(
                        selected = false,
                        onClick = { sortMenuExpanded = true },
                        label = {
                            Text(
                                when (state.sortField) {
                                    SortField.NAME -> "名称"
                                    SortField.SIZE -> "大小"
                                    SortField.UPDATED_AT -> "修改时间"
                                }
                            )
                        },
                        trailingIcon = {
                            Icon(Icons.Filled.ArrowDropDown, contentDescription = "选择排序字段")
                        }
                    )
                    DropdownMenu(
                        expanded = sortMenuExpanded,
                        onDismissRequest = { sortMenuExpanded = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("名称") },
                            onClick = { vm.toggleSort(SortField.NAME); sortMenuExpanded = false }
                        )
                        DropdownMenuItem(
                            text = { Text("大小") },
                            onClick = { vm.toggleSort(SortField.SIZE); sortMenuExpanded = false }
                        )
                        DropdownMenuItem(
                            text = { Text("修改时间") },
                            onClick = { vm.toggleSort(SortField.UPDATED_AT); sortMenuExpanded = false }
                        )
                    }
                }
                IconButton(onClick = { vm.toggleSort(state.sortField) }) {
                    Icon(
                        imageVector = if (state.sortDir == SortDir.ASC) Icons.Filled.ArrowUpward else Icons.Filled.ArrowDownward,
                        contentDescription = "切换排序方向"
                    )
                }
                Spacer(Modifier.width(8.dp))
                OutlinedTextField(
                    value = state.searchQuery,
                    onValueChange = vm::onSearchChange,
                    placeholder = { Text("搜索") },
                    singleLine = true,
                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp)
                )
            }

            if (state.error != null) {
                ErrorBanner(state.error.orEmpty(), onRetry = { vm.load(state.currentPath) })
            }

            UploadProgressPanel(state.uploads)

            state.downloadProgress?.let { dp ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp)
                ) {
                    Column(Modifier.padding(12.dp)) {
                        Text(
                            text = "下载 ${dp.name}",
                            style = MaterialTheme.typography.bodySmall,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(Modifier.height(4.dp))
                        LinearProgressIndicator(
                            progress = { Format.percent(dp.sent, dp.total) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(4.dp)
                        )
                    }
                }
            }

            when {
                state.loading && state.items.isEmpty() -> Box(
                    Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
                visibleItems.isEmpty() -> Box(
                    Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "此目录为空",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                else -> LazyColumn(Modifier.fillMaxSize()) {
                    items(visibleItems, key = { it.path }) { item ->
                        FileRow(
                            item = item,
                            canWrite = canWrite,
                            onOpen = {
                                if (item.isDir) vm.navigate(item.path) else vm.setPreview(item)
                            },
                            onDownload = {
                                pendingDownload = item
                                saveLauncher.launch(
                                    (item.mimeType.ifBlank { "application/octet-stream" }) to item.name
                                )
                            },
                            onDelete = { vm.setDeleteTarget(item) }
                        )
                    }
                }
            }
        }
    }

    // 同名文件覆盖确认
    if (state.pendingDuplicateNames.isNotEmpty()) {
        AlertDialog(
            onDismissRequest = vm::cancelDuplicateUpload,
            title = { Text("文件已存在") },
            text = {
                Text("以下文件已存在，继续将覆盖原文件：\n${state.pendingDuplicateNames.joinToString("\n")}")
            },
            confirmButton = {
                TextButton(onClick = vm::confirmDuplicateUpload) {
                    Text("覆盖")
                }
            },
            dismissButton = {
                TextButton(onClick = vm::cancelDuplicateUpload) {
                    Text("取消")
                }
            }
        )
    }

    // 新建文件夹
    if (state.showNewFolder) {
        NewFolderDialog(
            onDismiss = { vm.setShowNewFolder(false) },
            onCreate = { vm.createFolder(it) }
        )
    }

    // 删除确认
    state.deleteTarget?.let { target ->
        ConfirmDialog(
            title = "删除 ${target.name}",
            message = if (target.isDir) {
                "将递归删除该目录下全部内容，此操作不可撤销。"
            } else {
                "确定删除该文件吗？"
            },
            confirmText = "删除",
            onConfirm = { vm.delete() },
            onDismiss = { vm.setDeleteTarget(null) }
        )
    }

    // 预览
    state.previewItem?.let { item ->
        PreviewDialog(item = item, vm = vm, onDismiss = { vm.setPreview(null) })
    }
}

@Composable
private fun NewFolderDialog(onDismiss: () -> Unit, onCreate: (String) -> Unit) {
    var name by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("新建文件夹") },
        text = {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("文件夹名称") },
                singleLine = true
            )
        },
        confirmButton = {
            TextButton(onClick = { onCreate(name) }, enabled = name.isNotBlank()) {
                Text("创建")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("取消") }
        }
    )
}
