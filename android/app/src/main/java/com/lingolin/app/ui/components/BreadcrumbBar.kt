package com.lingolin.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.lingolin.app.util.Paths

/** 面包屑导航：根目录 + 逐级路径，非末级可点击跳转 */
@Composable
fun BreadcrumbBar(path: String, onNavigate: (String) -> Unit) {
    val segments = Paths.segments(path)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Start
    ) {
        Crumb(label = "根目录", target = "/", clickable = path != "/", onNavigate = onNavigate)
        segments.forEachIndexed { index, seg ->
            val segPath = Paths.segmentPath(path, index)
            val isLast = index == segments.lastIndex
            Text(
                text = "/",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.labelMedium
            )
            Crumb(label = seg, target = segPath, clickable = !isLast, onNavigate = onNavigate)
        }
    }
}

@Composable
private fun Crumb(label: String, target: String, clickable: Boolean, onNavigate: (String) -> Unit) {
    Text(
        text = label,
        style = MaterialTheme.typography.labelMedium,
        color = if (clickable) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
        fontWeight = if (!clickable) FontWeight.SemiBold else FontWeight.Normal,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .clickable(enabled = clickable) { onNavigate(target) }
            .padding(horizontal = 4.dp, vertical = 4.dp)
    )
}
