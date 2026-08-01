package com.lingolin.app.ui.connect

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.lingolin.app.AppGraph
import com.lingolin.app.ui.theme.Blue100
import com.lingolin.app.ui.theme.Blue600

/**
 * 连接页：服务器地址 + API Key，连接测试成功后进入文件页。
 */
@Composable
fun ConnectScreen(onConnected: () -> Unit) {
    val vm: ConnectViewModel = viewModel { ConnectViewModel(AppGraph.repository) }
    val state by vm.state.collectAsState()

    LaunchedEffect(Unit) {
        vm.events.collect { if (it is ConnectEvent.Connected) onConnected() }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(Blue100, MaterialTheme.colorScheme.background))),
        contentAlignment = Alignment.Center
    ) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            tonalElevation = 4.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "LingoLin",
                    style = MaterialTheme.typography.headlineLarge,
                    color = Blue600
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "文件共享客户端",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.secondary
                )
                Spacer(Modifier.height(24.dp))

                OutlinedTextField(
                    value = state.baseUrl,
                    onValueChange = vm::onUrlChange,
                    label = { Text("服务器地址") },
                    placeholder = { Text("http://192.168.1.100:8080") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = state.apiKey,
                    onValueChange = vm::onKeyChange,
                    label = { Text("API Key") },
                    placeholder = { Text("lingolin_xxxxxxxx") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth()
                )

                if (state.error != null) {
                    Spacer(Modifier.height(12.dp))
                    Text(
                        text = state.error.orEmpty(),
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        textAlign = TextAlign.Center
                    )
                }

                Spacer(Modifier.height(24.dp))
                Button(
                    onClick = vm::connect,
                    enabled = !state.testing,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                ) {
                    if (state.testing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    } else {
                        Text("连接服务端")
                    }
                }

                if (state.isConfigured) {
                    Spacer(Modifier.height(8.dp))
                    TextButton(onClick = vm::enterExisting) {
                        Text("已有配置，直接进入文件浏览 →")
                    }
                }
            }
        }
    }
}
