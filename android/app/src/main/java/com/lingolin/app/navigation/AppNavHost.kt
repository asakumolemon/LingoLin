package com.lingolin.app.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.lingolin.app.AppGraph
import com.lingolin.app.ui.connect.ConnectScreen
import com.lingolin.app.ui.files.FileBrowserScreen
import com.lingolin.app.ui.settings.SettingsScreen

object Routes {
    const val CONNECT = "connect"
    const val MAIN = "main"
}

/**
 * 顶层导航：连接页（无配置时的首屏）→ 主界面（文件/设置 底部导航）。
 * 断开连接时清空返回栈，防止返回键退回已断开的会话。
 */
@Composable
fun AppNavHost() {
    val navController = rememberNavController()
    NavHost(
        navController = navController,
        startDestination = if (AppGraph.repository.isConfigured) Routes.MAIN else Routes.CONNECT
    ) {
        composable(Routes.CONNECT) {
            ConnectScreen(
                onConnected = {
                    navController.navigate(Routes.MAIN) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
        composable(Routes.MAIN) {
            MainScreen(
                onDisconnected = {
                    navController.navigate(Routes.CONNECT) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    }
}
