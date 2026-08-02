package com.lingolin.app.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.lingolin.app.AppGraph
import com.lingolin.app.data.model.ConnectionConfig
import com.lingolin.app.ui.components.ConfirmDialog

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(onDisconnected: () -> Unit) {
    val vm: SettingsViewModel = viewModel { SettingsViewModel(AppGraph.repository) }
    val state by vm.state.collectAsState()
    LaunchedEffect(Unit) {
        vm.events.collect {
            when (it) {
                SettingsEvent.Disconnected -> onDisconnected()
                SettingsEvent.ConnectionChanged -> Unit
            }
        }
    }

    Scaffold(topBar = { TopAppBar(title = { Text("设置") }) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("连接配置", style = MaterialTheme.typography.titleLarge)
            state.connections.forEach { profile ->
                ConnectionCard(profile, profile.id == state.activeId, onSelect = { vm.switchConnection(profile.id) }, onDelete = { vm.requestDelete(profile.id) })
            }
            TextButton(onClick = vm::newConnection, modifier = Modifier.fillMaxWidth()) { Text("新增连接") }

            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(if (state.editingId == null) "新增连接" else "编辑连接", style = MaterialTheme.typography.titleMedium)
                    OutlinedTextField(state.name, vm::onNameChange, label = { Text("配置名称") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(state.baseUrl, vm::onUrlChange, label = { Text("服务器地址") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(state.apiKey, vm::onKeyChange, label = { Text("API Key") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
                    state.error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                    Button(onClick = vm::saveAndConnect, enabled = !state.testing, modifier = Modifier.fillMaxWidth()) {
                        if (state.testing) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) else Text("保存并连接")
                    }
                }
            }

            state.permission?.let { p ->
                Text("当前权限：${if (p.read) "读" else "无读"} / ${if (p.write) "写" else "无写"}" + if (p.allowPaths.isNotEmpty()) "  路径：${p.allowPaths.joinToString(", ")}" else "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
            }
            TextButton(onClick = { vm.setShowDisconnect(true) }, modifier = Modifier.fillMaxWidth()) { Text("移除当前连接", color = MaterialTheme.colorScheme.error) }
        }
    }

    if (state.showDisconnectConfirm) {
        ConfirmDialog(title = "移除当前连接", message = "只会移除当前配置，其他已保存配置不会受到影响。确定继续吗？", confirmText = "移除", onConfirm = { vm.setShowDisconnect(false); vm.disconnect() }, onDismiss = { vm.setShowDisconnect(false) })
    }
    if (state.showDeleteConfirm) {
        ConfirmDialog(title = "删除连接配置", message = "此操作不可撤销，确定删除吗？", confirmText = "删除", onConfirm = { vm.setShowDelete(false); vm.deleteConfirmed() }, onDismiss = { vm.setShowDelete(false) })
    }
}

@Composable
private fun ConnectionCard(profile: ConnectionConfig, active: Boolean, onSelect: () -> Unit, onDelete: () -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(profile.name + if (active) "（当前）" else "", style = MaterialTheme.typography.titleMedium)
            Text(profile.baseUrl, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
            Text("密钥：${profile.maskedApiKey}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
            Column(Modifier.fillMaxWidth()) {
                if (!active) TextButton(onClick = onSelect) { Text("切换") }
                TextButton(onClick = onDelete) { Text("删除", color = MaterialTheme.colorScheme.error) }
            }
        }
    }
}
