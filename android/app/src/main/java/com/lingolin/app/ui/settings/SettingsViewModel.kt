package com.lingolin.app.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lingolin.app.data.model.ConnectionConfig
import com.lingolin.app.data.model.KeyPermission
import com.lingolin.app.data.repository.FileRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID

data class SettingsUiState(
    val connections: List<ConnectionConfig> = emptyList(),
    val activeId: String? = null,
    val editingId: String? = null,
    val name: String = "",
    val currentUrl: String = "",
    val currentKeyMasked: String = "",
    val baseUrl: String = "",
    val apiKey: String = "",
    val testing: Boolean = false,
    val error: String? = null,
    val permission: KeyPermission? = null,
    val showDisconnectConfirm: Boolean = false,
    val showDeleteConfirm: Boolean = false,
    val deleteTargetId: String? = null
)

sealed interface SettingsEvent {
    data object Disconnected : SettingsEvent
    data object ConnectionChanged : SettingsEvent
}

class SettingsViewModel(private val repository: FileRepository) : ViewModel() {
    private val _state = MutableStateFlow(buildState())
    val state = _state.asStateFlow()
    private val _events = MutableSharedFlow<SettingsEvent>()
    val events = _events.asSharedFlow()

    init { loadPermission() }

    private fun buildState() = repository.activeConnection.let { active ->
        SettingsUiState(
            connections = repository.connections,
            activeId = active?.id,
            editingId = active?.id,
            name = active?.name.orEmpty(),
            currentUrl = active?.baseUrl.orEmpty(),
            currentKeyMasked = active?.maskedApiKey.orEmpty(),
            baseUrl = active?.baseUrl.orEmpty(),
            apiKey = active?.apiKey.orEmpty()
        )
    }

    private fun loadPermission() {
        viewModelScope.launch { try { _state.update { it.copy(permission = repository.testAndGetPermission()) } } catch (_: Exception) {} }
    }

    fun onNameChange(value: String) = _state.update { it.copy(name = value, error = null) }
    fun onUrlChange(value: String) = _state.update { it.copy(baseUrl = value, error = null) }
    fun onKeyChange(value: String) = _state.update { it.copy(apiKey = value, error = null) }
    fun setShowDisconnect(show: Boolean) = _state.update { it.copy(showDisconnectConfirm = show) }
    fun setShowDelete(show: Boolean) = _state.update { it.copy(showDeleteConfirm = show) }

    fun select(connection: ConnectionConfig) = _state.update {
        it.copy(editingId = connection.id, name = connection.name, baseUrl = connection.baseUrl, apiKey = connection.apiKey, error = null)
    }

    fun newConnection() = _state.update { it.copy(editingId = null, name = "", baseUrl = "", apiKey = "", error = null) }

    fun saveAndConnect() {
        val s = _state.value
        val name = s.name.trim(); val url = s.baseUrl.trim().trimEnd('/'); val key = s.apiKey.trim()
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
                        val permission = repository.testAndGetPermission()
                        _state.value = buildState().copy(permission = permission)
                        _events.emit(SettingsEvent.ConnectionChanged)
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

    fun switchConnection(id: String) {
        if (_state.value.testing || id == repository.activeConnection?.id) return
        val oldId = repository.activeConnection?.id
        _state.update { it.copy(testing = true, error = null) }
        viewModelScope.launch {
            try {
                if (!repository.activateConnection(id)) throw IllegalStateException("连接配置不存在")
                val permission = repository.testAndGetPermission()
                _state.value = buildState().copy(permission = permission)
                _events.emit(SettingsEvent.ConnectionChanged)
            } catch (e: Exception) {
                if (oldId != null) repository.activateConnection(oldId)
                _state.update { it.copy(testing = false, error = e.message ?: "连接失败") }
            }
        }
    }

    fun requestDelete(id: String) = _state.update { it.copy(deleteTargetId = id, showDeleteConfirm = true) }

    fun deleteConfirmed() {
        val id = _state.value.deleteTargetId ?: return
        repository.deleteConnection(id)
        _state.update { buildState() }
        if (!repository.isConfigured) viewModelScope.launch { _events.emit(SettingsEvent.Disconnected) } else {
            _state.update { buildState() }
            viewModelScope.launch { _events.emit(SettingsEvent.ConnectionChanged) }
        }
    }

    fun disconnect() {
        val active = repository.activeConnection ?: return
        repository.deleteConnection(active.id)
        if (!repository.isConfigured) viewModelScope.launch { _events.emit(SettingsEvent.Disconnected) } else {
            _state.update { buildState() }
            viewModelScope.launch { _events.emit(SettingsEvent.ConnectionChanged) }
        }
    }
}
