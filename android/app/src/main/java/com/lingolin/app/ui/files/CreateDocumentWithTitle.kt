package com.lingolin.app.ui.files

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.result.contract.ActivityResultContract

/**
 * ACTION_CREATE_DOCUMENT 的自定义契约：除了 MIME 类型，还携带默认文件名（EXTRA_TITLE）。
 */
class CreateDocumentWithTitle : ActivityResultContract<Pair<String, String>, Uri?>() {

    override fun createIntent(context: Context, input: Pair<String, String>): Intent =
        Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = input.first
            putExtra(Intent.EXTRA_TITLE, input.second)
        }

    override fun parseResult(resultCode: Int, intent: Intent?): Uri? =
        if (resultCode == Activity.RESULT_OK) intent?.data else null
}
