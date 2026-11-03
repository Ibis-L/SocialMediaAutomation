package com.example.automation

object AutomationState {
    @Volatile
    var isAutomationActive = false

    @Volatile
    var isDownloading = false
    
    @Volatile
    var currentTaskType: String = "WHATSAPP" // "WHATSAPP" or "YOUTUBE"
    
    @Volatile
    var currentTaskId: String? = null
    
    @Volatile
    var videoTitle: String? = null
    
    @Volatile
    var videoDescription: String? = null

    @Volatile
    var isMadeForKids: Boolean = true

    @Volatile
    var commentsEnabled: Boolean = true
    
    @Volatile
    var serverBaseUrl: String? = null

    @Volatile
    var deviceToken: String? = null

    @Volatile
    var platform: String = "WHATSAPP" // "WHATSAPP", "TWITTER", "YOUTUBE", or "INSTAGRAM"

    @Volatile
    var taskType: String = "WHATSAPP" // "WHATSAPP", "TWITTER_DM", "TWITTER_TWEET", "YOUTUBE", "INSTAGRAM_DM"

    @Volatile
    var instagramMethod: String = "COORDINATES" // "COORDINATES" or "ACCESSIBILITY"

    @Volatile
    var instagramPhase: String = "IDLE" // "DM_TAB", "SEARCH_FOCUS", "SEARCH_EXPAND", "TYPE_USERNAME", "SELECT_USER", "TYPE_MESSAGE", "SEND_MESSAGE", "IDLE"

    @Volatile
    var targetHandle: String? = null

    @Volatile
    var taskContent: String? = null

    @Volatile
    var twitterPhase: String = "IDLE" // "PROFILE_CHECK", "CONVERSATION", "TWEET_COMPOSE", "IDLE"

    @Volatile
    var currentMessage: String? = null
}