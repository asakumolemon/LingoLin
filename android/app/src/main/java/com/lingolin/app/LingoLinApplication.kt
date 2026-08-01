package com.lingolin.app

import android.app.Application

class LingoLinApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        AppGraph.init(this)
    }
}
