from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import api_views
from . import twitter_views

router = DefaultRouter()
router.register(r'editor/article', api_views.ScrapedArticleViewSet, basename='editor-article')
router.register(r'scraper/sources', api_views.DashboardSourceViewSet, basename='scraper-sources')
router.register(r'scraper/feed', api_views.ScrapeLogViewSet, basename='scraper-feed')
router.register(r'devices', api_views.WhatsAppDeviceViewSet, basename='devices')
router.register(r'tasks', api_views.WhatsAppTaskViewSet, basename='tasks')
router.register(r'twitter/targets', twitter_views.TwitterTargetViewSet, basename='twitter-targets')
router.register(r'twitter/tasks', twitter_views.TwitterTaskViewSet, basename='twitter-tasks')
router.register(r'app-versions', api_views.AppReleaseViewSet, basename='app-version')

urlpatterns = [
    path('panel/', views.scraper_panel, name='scraper_panel'),
    path('api/articles/', views.api_articles, name='api_articles'),
    path('api/scraper/stats/', api_views.DashboardStatsView.as_view(), name='scraper-stats'),
    path('api/', include(router.urls)),
]
