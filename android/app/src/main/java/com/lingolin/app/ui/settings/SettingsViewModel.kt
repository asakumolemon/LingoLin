package com.lingolin.app.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lingolin.app.data.model.KeyPermission
import com.lingolin.app.data.repository.FileRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SettingsUiState(
    val currentUrl: String = "",
    val currentKeyMasked: String = "",
    val baseUrl: String = "",
    val apiKey: String = "",
    val testing: Boolean = false,
    val error: String? = null,
    val permission: KeyPermission? = null,
    val showDisconnectConfirm: Boolean = false
)

sealed interface SettingsEvent {
    data object Disconnected : SettingsEvent
}

class SettingsViewModel(private val repository: FileRepository) : ViewModel() {

    private val _state = MutableStateFlow(
        SettingsUiState(
            currentUrl = repository.baseUrl,
            currentKeyMasked = repository.apiKey.take(20),
            baseUrl = repository.baseUrl,
            apiKey = repository.apiKey
        )
    )
    val state = _state.asStateFlow()

    private val _events = MutableSharedFlow<SettingsEvent>()
    val events = _events.asSharedFlow()

    init {
        loadPermission()
    }

    private fun loadPermission() {
        viewModelScope.launch {
            try {
                _state.update { it.copy(permission = repository.testAndGetPermission()) }
            } catch (_: Exception) {
            }
        }
    }

    fun onUrlChange(value: String) = _state.update { it.copy(baseUrl = value, error = null) }
    fun onKeyChange(value: String) = _state.update { it.copy(apiKey = value, error = null) }
    fun setShowDisconnect(show: Boolean) = _state.update { it.copy(showDisconnectConfirm = show) }

    /** 修改连接：与连接页同逻辑，但用 list("/") 验证（对齐 desktop 设置页） */
    fun saveAndConnect() {
        val s = _state.value
        val url = s.baseUrl.trim().trimEnd('/')
        val key = s.apiKey.trim()
        when {
            url.isEmpty() || key.isEmpty() ->
                _state.update { it.copy(error = "请输入服务器地址和 API Key") }
            !url.startsWith("http://") && !url.startsWith("https://") ->
                _state.update { it.copy(error = "地址需以 http:// 或 https:// 开头") }
            else -> {
                val oldUrl = s.currentUrl
                val oldKey = repository.apiKey
                _state.update { it.copy(testing = true, error = null) }
                viewModelScope.launch {
                    try {
                        repository.saveConfig(url, key)
                        repository.list("/") // 验证连接
                        _state.update {
                            it.copy(
                                testing = false,
                                currentUrl = repository.baseUrl,
                                currentKeyMasked = repository.apiKey.take(20),
                                baseUrl = repository.baseUrl,
                                apiKey = repository.apiKey
                            )
                        }
                        loadPermission()
                    } catch (e: Exception) {
                        // 失败回滚到旧配置
                        repository.saveConfig(oldUrl, oldKey)
                        _state.update { it.copy(testing = false, error = e.message ?: "连接失败") }
                    }
                }
            }
        }
    }

    fun disconnect() {
        repository.clearConfig()
        viewModelScope.launch { _events.emit(SettingsEvent.Disconnected) }
    }
}
