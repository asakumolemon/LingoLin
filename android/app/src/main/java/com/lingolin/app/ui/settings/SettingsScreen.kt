package com.lingolin.app.ui.settings

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import com.lingolin.app.ui.components.ConfirmDialog

/**
 * 设置页：当前连接信息 + 修改连接 + 断开连接。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(onDisconnected: () -> Unit) {
    val vm: SettingsViewModel = viewModel { SettingsViewModel(AppGraph.repository) }
    val state by vm.state.collectAsState()

    LaunchedEffect(Unit) {
        vm.events.collect { if (it is SettingsEvent.Disconnected) onDisconnected() }
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("设置") }) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // 当前连接
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text("当前已连接", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = "服务器：${state.currentUrl}",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = "密钥：${state.currentKeyMasked}${if (state.currentKeyMasked.length >= 20) "…" else ""}",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    state.permission?.let { p ->
                        Spacer(Modifier.height(8.dp))
                        Text(
                            text = "权限：${if (p.read) "读" else "无读"} / ${if (p.write) "写" else "无写"}" +
                                if (p.allowPaths.isNotEmpty()) "  路径：${p.allowPaths.joinToString(", ")}" else "",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            // 修改连接
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text("修改连接", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = state.baseUrl,
                        onValueChange = vm::onUrlChange,
                        label = { Text("服务器地址") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = state.apiKey,
                        onValueChange = vm::onKeyChange,
                        label = { Text("API Key") },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth()
                    )
                    if (state.error != null) {
                        Spacer(Modifier.height(8.dp))
                        Text(
                            text = state.error.orEmpty(),
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = vm::saveAndConnect,
                        enabled = !state.testing,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        if (state.testing) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("保存并连接")
                        }
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            TextButton(
                onClick = { vm.setShowDisconnect(true) },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("断开连接", color = MaterialTheme.colorScheme.error)
            }
        }
    }

    if (state.showDisconnectConfirm) {
        ConfirmDialog(
            title = "断开连接",
            message = "将清除当前服务器地址和 API Key，确定断开吗？",
            confirmText = "断开",
            onConfirm = { vm.disconnect() },
            onDismiss = { vm.setShowDisconnect(false) }
        )
    }
}
