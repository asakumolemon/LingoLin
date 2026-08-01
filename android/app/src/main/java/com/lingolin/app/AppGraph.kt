package com.lingolin.app

import android.content.Context
import com.lingolin.app.data.local.ConfigStore
import com.lingolin.app.data.remote.ApiClient
import com.lingolin.app.data.repository.FileRepository

/** 手工 DI 单例：应用启动时初始化，依赖数量少，无需引入 Hilt */
object AppGraph {

    lateinit var repository: FileRepository
        private set

    fun init(context: Context) {
        val configStore = ConfigStore(context)
        val apiClient = ApiClient(configStore)
        repository = FileRepository(apiClient, configStore)
    }
}
