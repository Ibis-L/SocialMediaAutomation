package com.example.automation

object AutomationState {
    @Volatile
    var isAutomationActive = false
    
    @Volatile
    var currentTaskId: String? = null
    
    @Volatile
    var serverBaseUrl: String? = null

    @Volatile
    var platform: String = "WHATSAPP" // "WHATSAPP" or "TWITTER"

    @Volatile
    var taskType: String = "WHATSAPP" // "WHATSAPP", "TWITTER_DM", "TWITTER_TWEET"

    @Volatile
    var targetHandle: String? = null

    @Volatile
    var taskContent: String? = null

    @Volatile
    var twitterPhase: String = "IDLE" // "PROFILE_CHECK", "CONVERSATION", "TWEET_COMPOSE", "IDLE"
}