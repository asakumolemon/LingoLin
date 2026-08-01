package com.lingolin.app.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * 安全存储连接配置（服务器地址 + API Key）。
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

    var baseUrl: String?
        get() = prefs.getString(KEY_URL, null)
        set(value) {
            prefs.edit().putString(KEY_URL, value?.trim()?.trimEnd('/')).apply()
        }

    var apiKey: String?
        get() = prefs.getString(KEY_KEY, null)
        set(value) {
            prefs.edit().putString(KEY_KEY, value?.trim()).apply()
        }

    val isConfigured: Boolean
        get() = !baseUrl.isNullOrBlank() && !apiKey.isNullOrBlank()

    fun clear() {
        prefs.edit().clear().apply()
    }

    private companion object {
        const val PREF_FILE = "lingolin_config"
        const val KEY_URL = "base_url"
        const val KEY_KEY = "api_key"
    }
}
