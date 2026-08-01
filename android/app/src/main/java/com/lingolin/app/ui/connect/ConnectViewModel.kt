package com.lingolin.app.ui.connect

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lingolin.app.data.repository.FileRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ConnectUiState(
    val baseUrl: String = "",
    val apiKey: String = "",
    val testing: Boolean = false,
    val error: String? = null,
    val isConfigured: Boolean = false
)

sealed interface ConnectEvent {
    data object Connected : ConnectEvent
}

class ConnectViewModel(private val repository: FileRepository) : ViewModel() {

    private val _state = MutableStateFlow(
        ConnectUiState(
            baseUrl = repository.baseUrl,
            apiKey = repository.apiKey,
            isConfigured = repository.isConfigured
        )
    )
    val state = _state.asStateFlow()

    private val _events = MutableSharedFlow<ConnectEvent>()
    val events = _events.asSharedFlow()

    fun onUrlChange(value: String) = _state.update { it.copy(baseUrl = value, error = null) }
    fun onKeyChange(value: String) = _state.update { it.copy(apiKey = value, error = null) }

    /** 校验 → 写配置 → 连接测试（GET /permissions）→ 成功进入 / 失败回滚 */
    fun connect() {
        val s = _state.value
        val url = s.baseUrl.trim().trimEnd('/')
        val key = s.apiKey.trim()
        when {
            url.isEmpty() || key.isEmpty() ->
                _state.update { it.copy(error = "请输入服务器地址和 API Key") }
            !url.startsWith("http://") && !url.startsWith("https://") ->
                _state.update { it.copy(error = "地址需以 http:// 或 https:// 开头") }
            else -> {
                _state.update { it.copy(testing = true, error = null) }
                viewModelScope.launch {
                    try {
                        repository.saveConfig(url, key)
                        repository.testAndGetPermission()
                        _state.update { it.copy(testing = false, isConfigured = true) }
                        _events.emit(ConnectEvent.Connected)
                    } catch (e: Exception) {
                        repository.clearConfig()
                        _state.update { it.copy(testing = false, error = e.message ?: "连接失败") }
                    }
                }
            }
        }
    }

    /** 已有配置时直接进入文件页 */
    fun enterExisting() {
        viewModelScope.launch { _events.emit(ConnectEvent.Connected) }
    }
}
