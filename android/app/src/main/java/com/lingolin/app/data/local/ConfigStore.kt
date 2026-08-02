package com.lingolin.app.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.lingolin.app.data.model.ConnectionConfig
import java.util.UUID

/**
 * 安全存储多个连接配置（服务器地址 + API Key）。
 * 使用 EncryptedSharedPreferences（AES256），避免 API Key 明文落盘。
 */
class ConfigStore(context: Context) {

    private val prefs: SharedPreferences by lazy {
        EncryptedSharedPreferences.create(
            context.applicationContext,
            PREF_FILE,
            MasterKey.Builder(context.applicationContext)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build(),
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    private val gson = Gson()

    val connections: List<ConnectionConfig>
        get() {
            migrateLegacyIfNeeded()
            val raw = prefs.getString(KEY_CONNECTIONS, null) ?: return emptyList()
            return try {
                gson.fromJson<List<ConnectionConfig>>(raw, CONNECTION_LIST_TYPE) ?: emptyList()
            } catch (_: Exception) {
                emptyList()
            }
        }

    val activeConnection: ConnectionConfig?
        get() {
            val all = connections
            val activeId = prefs.getString(KEY_ACTIVE_ID, null)
            return all.firstOrNull { it.id == activeId } ?: all.firstOrNull()
        }

    val baseUrl: String?
        get() = activeConnection?.baseUrl

    val apiKey: String?
        get() = activeConnection?.apiKey

    val isConfigured: Boolean
        get() = activeConnection != null

    fun saveConnection(connection: ConnectionConfig, activate: Boolean = true) {
        val normalized = connection.copy(
            name = connection.name.trim(),
            baseUrl = connection.baseUrl.trim().trimEnd('/'),
            apiKey = connection.apiKey.trim()
        )
        val updated = connections.toMutableList().apply {
            val index = indexOfFirst { it.id == normalized.id }
            if (index >= 0) this[index] = normalized else add(normalized)
        }
        writeConnections(updated, if (activate) normalized.id else prefs.getString(KEY_ACTIVE_ID, null))
    }

    fun activateConnection(id: String): Boolean {
        if (connections.none { it.id == id }) return false
        prefs.edit().putString(KEY_ACTIVE_ID, id).apply()
        return true
    }

    fun deleteConnection(id: String): ConnectionConfig? {
        val remaining = connections.filterNot { it.id == id }
        val currentActiveId = prefs.getString(KEY_ACTIVE_ID, null)
        val nextActiveId = when {
            remaining.isEmpty() -> null
            currentActiveId != id && remaining.any { it.id == currentActiveId } -> currentActiveId
            else -> remaining.first().id
        }
        writeConnections(remaining, nextActiveId)
        return remaining.firstOrNull { it.id == nextActiveId }
    }

    fun clear() {
        prefs.edit()
            .remove(KEY_CONNECTIONS)
            .remove(KEY_ACTIVE_ID)
            .remove(KEY_URL)
            .remove(KEY_KEY)
            .apply()
    }

    private fun migrateLegacyIfNeeded() {
        if (prefs.contains(KEY_CONNECTIONS)) return
        val legacyUrl = prefs.getString(KEY_URL, null)?.trim()?.trimEnd('/')
        val legacyKey = prefs.getString(KEY_KEY, null)?.trim()
        if (!legacyUrl.isNullOrBlank() && !legacyKey.isNullOrBlank()) {
            val migrated = ConnectionConfig(UUID.randomUUID().toString(), "默认连接", legacyUrl, legacyKey)
            writeConnections(listOf(migrated), migrated.id)
            prefs.edit().remove(KEY_URL).remove(KEY_KEY).apply()
        }
    }

    private fun writeConnections(items: List<ConnectionConfig>, activeId: String?) {
        val editor = prefs.edit().putString(KEY_CONNECTIONS, gson.toJson(items))
        if (activeId == null) editor.remove(KEY_ACTIVE_ID) else editor.putString(KEY_ACTIVE_ID, activeId)
        editor.apply()
    }

    private companion object {
        const val PREF_FILE = "lingolin_config"
        const val KEY_CONNECTIONS = "connections"
        const val KEY_ACTIVE_ID = "active_connection_id"
        const val KEY_URL = "base_url"
        const val KEY_KEY = "api_key"
        val CONNECTION_LIST_TYPE = object : TypeToken<List<ConnectionConfig>>() {}.type
    }
}
