package com.lingolin.app.ui.connect

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lingolin.app.data.model.ConnectionConfig
import com.lingolin.app.data.repository.FileRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID

data class ConnectUiState(
    val name: String = "",
    val baseUrl: String = "",
    val apiKey: String = "",
    val profiles: List<ConnectionConfig> = emptyList(),
    val editingId: String? = null,
    val testing: Boolean = false,
    val error: String? = null,
    val isConfigured: Boolean = false
)

sealed interface ConnectEvent { data object Connected : ConnectEvent }

class ConnectViewModel(private val repository: FileRepository) : ViewModel() {
    private val _state = MutableStateFlow(
        ConnectUiState(
            profiles = repository.connections,
            name = repository.activeConnection?.name.orEmpty(),
            baseUrl = repository.baseUrl,
            apiKey = repository.apiKey,
            editingId = repository.activeConnection?.id,
            isConfigured = repository.isConfigured
        )
    )
    val state = _state.asStateFlow()
    private val _events = MutableSharedFlow<ConnectEvent>()
    val events = _events.asSharedFlow()

    fun onNameChange(value: String) = _state.update { it.copy(name = value, error = null) }
    fun onUrlChange(value: String) = _state.update { it.copy(baseUrl = value, error = null) }
    fun onKeyChange(value: String) = _state.update { it.copy(apiKey = value, error = null) }

    fun select(connection: ConnectionConfig) = _state.update {
        it.copy(name = connection.name, baseUrl = connection.baseUrl, apiKey = connection.apiKey, editingId = connection.id, error = null)
    }

    fun newConnection() = _state.update { it.copy(name = "", baseUrl = "", apiKey = "", editingId = null, error = null) }

    fun connect() {
        val s = _state.value
        val name = s.name.trim()
        val url = s.baseUrl.trim().trimEnd('/')
        val key = s.apiKey.trim()
        when {
            name.isEmpty() || url.isEmpty() || key.isEmpty() -> _state.update { it.copy(error = "请输入配置名称、服务器地址和 API Key") }
            !url.startsWith("http://") && !url.startsWith("https://") -> _state.update { it.copy(error = "地址需以 http:// 或 https:// 开头") }
            else -> {
                val old = repository.activeConnection
                val connection = ConnectionConfig(s.editingId ?: UUID.randomUUID().toString(), name, url, key)
                _state.update { it.copy(testing = true, error = null) }
                viewModelScope.launch {
                    try {
                        repository.saveConnection(connection)
                        repository.testAndGetPermission()
                        _state.update { it.copy(testing = false, profiles = repository.connections, isConfigured = true, editingId = repository.activeConnection?.id) }
                        _events.emit(ConnectEvent.Connected)
                    } catch (e: Exception) {
                        if (old == null) {
                            repository.clearConfig()
                        } else {
                            if (connection.id != old.id) repository.deleteConnection(connection.id)
                            repository.saveConnection(old)
                        }
                        _state.update { it.copy(testing = false, error = e.message ?: "连接失败") }
                    }
                }
            }
        }
    }

    fun enterExisting() { viewModelScope.launch { _events.emit(ConnectEvent.Connected) } }
}
