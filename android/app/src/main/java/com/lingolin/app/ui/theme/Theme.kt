package com.lingolin.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Blue600,
    onPrimary = Color.White,
    primaryContainer = Blue100,
    onPrimaryContainer = Color(0xFF0F2A5C),
    secondary = Slate600,
    background = Slate50,
    surface = Color.White,
    onSurface = Color(0xFF1E293B),
    onBackground = Color(0xFF1E293B),
    error = Red600
)

private val DarkColors = darkColorScheme(
    primary = DarkPrimary,
    onPrimary = Color(0xFF0F172A),
    primaryContainer = Color(0xFF1D3A6E),
    secondary = Color(0xFF94A3B8),
    background = DarkBg,
    surface = DarkSurface,
    onSurface = DarkOnSurface,
    onBackground = DarkOnSurface,
    error = DarkError
)

@Composable
fun LingoLinTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = Typography,
        content = content
    )
}
