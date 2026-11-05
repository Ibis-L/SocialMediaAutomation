from rest_framework import serializers
from .models import (
    ScrapedArticle, TemplateConfig, ScrapeLog, WhatsAppDevice, DeviceContact, 
    WhatsAppTask, TwitterTarget, TwitterTask, TwitterMedia, InstagramTask, InstagramMedia, FacebookTask, FacebookMedia
)
from django.utils import timezone
from datetime import timedelta

class ReviewNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='user.username', read_only=True)
    note = serializers.CharField(source='text', read_only=True)
    
    class Meta:
        from .models import ReviewNote
        model = ReviewNote
        fields = ['id', 'user', 'author_name', 'note', 'created_at']

class ScrapedArticleSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.name', read_only=True)
    review_notes = ReviewNoteSerializer(many=True, read_only=True)
    
    class Meta:
        model = ScrapedArticle
        fields = [
            'id', 'template', 'template_name', 'source_url', 'title', 
            'content', 'scraped_at', 'status', 'edited_content', 
            'cover_image', 'seo_title', 'seo_desc', 'seo_keywords',
            'sentiment', 'readability', 'seo_score', 'review_notes'
        ]

class DashboardSourceSerializer(serializers.ModelSerializer):
    scraped_24h = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()

    class Meta:
        model = TemplateConfig
        fields = [
            'id', 'name', 'domain', 'status', 'last_scraped_at', 
            'scraped_24h', 'type', 'url_identifier', 'portal_type', 
            'url_pattern', 'selectors'
        ]

    def get_type(self, obj):
        return "WEBSITE"

    def create(self, validated_data):
        if 'status' not in validated_data:
            validated_data['status'] = 'Active'
        return super().create(validated_data)

    def get_scraped_24h(self, obj):
        time_threshold = timezone.now() - timedelta(hours=24)
        return ScrapedArticle.objects.filter(template=obj, scraped_at__gte=time_threshold).count()

class ScrapeLogSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.name', read_only=True)

    class Meta:
        model = ScrapeLog
        fields = ['id', 'template_name', 'url', 'status', 'message', 'created_at']

class DeviceContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceContact
        fields = ['id', 'phone_number', 'name', 'created_at']

class TwitterTargetSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)

    class Meta:
        model = TwitterTarget
        fields = ['id', 'device', 'device_name', 'handle', 'name', 'category', 'notes', 'created_at']

class WhatsAppDeviceSerializer(serializers.ModelSerializer):
    contacts = DeviceContactSerializer(many=True, read_only=True)
    twitter_targets = TwitterTargetSerializer(many=True, read_only=True)

    class Meta:
        model = WhatsAppDevice
        fields = [
            'id', 'phone_number', 'name', 'twitter_handle', 'api_token',
            'battery_level', 'battery_status', 'temperature', 
            'last_heartbeat', 'contacts', 'twitter_targets', 'created_at'
        ]
        extra_kwargs = {
            'api_token': {'read_only': True}
        }

class WhatsAppTaskSerializer(serializers.ModelSerializer):
    device_number = serializers.CharField(source='device.phone_number', read_only=True)
    
    class Meta:
        model = WhatsAppTask
        fields = ['id', 'device', 'device_number', 'contact_number', 'platform', 'message', 'status', 'created_at', 'processed_at']

class TwitterMediaSerializer(serializers.ModelSerializer):
    media_url = serializers.SerializerMethodField()

    class Meta:
        model = TwitterMedia
        fields = ['id', 'file', 'media_url', 'order']

    def get_media_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

class TwitterTaskSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    device_phone = serializers.CharField(source='device.phone_number', read_only=True)
    device_twitter_handle = serializers.CharField(source='device.twitter_handle', read_only=True)
    media_files = TwitterMediaSerializer(many=True, read_only=True)
    article_title = serializers.CharField(source='article.title', read_only=True)

    class Meta:
        model = TwitterTask
        fields = [
            'id', 'device', 'device_name', 'device_phone', 'device_twitter_handle',
            'task_type', 'target_handle', 'content', 'hashtags', 'article', 'article_title',
            'media_files', 'status', 'result_message', 'created_at', 'processed_at'
        ]

class InstagramMediaSerializer(serializers.ModelSerializer):
    media_url = serializers.SerializerMethodField()

    class Meta:
        model = InstagramMedia
        fields = ['id', 'file', 'media_url', 'media_type', 'order']

    def get_media_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

class InstagramTaskSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    device_phone = serializers.CharField(source='device.phone_number', read_only=True)
    media_files = InstagramMediaSerializer(many=True, read_only=True)
    article_title = serializers.CharField(source='article.title', read_only=True)
    full_caption = serializers.CharField(source='full_caption', read_only=True)

    class Meta:
        model = InstagramTask
        fields = [
            'id', 'device', 'device_name', 'device_phone',
            'task_type', 'caption', 'hashtags', 'full_caption',
            'article', 'article_title', 'media_files', 'status',
            'created_at', 'processed_at'
        ]

class FacebookMediaSerializer(serializers.ModelSerializer):
    media_url = serializers.SerializerMethodField()

    class Meta:
        model = FacebookMedia
        fields = ['id', 'file', 'media_url', 'media_type', 'order']

    def get_media_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

class FacebookTaskSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    device_phone = serializers.CharField(source='device.phone_number', read_only=True)
    media_files = FacebookMediaSerializer(many=True, read_only=True)
    article_title = serializers.CharField(source='article.title', read_only=True)

    class Meta:
        model = FacebookTask
        fields = [
            'id', 'device', 'device_name', 'device_phone',
            'task_type', 'caption', 'target_url',
            'article', 'article_title', 'media_files', 'status', 'result_message',
            'created_at', 'processed_at'
        ]

class AppReleaseSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import AppRelease
        model = AppRelease
        fields = '__all__'

class YouTubeVideoSerializer(serializers.ModelSerializer):
    video_url = serializers.SerializerMethodField()

    class Meta:
        from .models import YouTubeVideo
        model = YouTubeVideo
        fields = ['id', 'title', 'description', 'video_file', 'video_url', 'is_made_for_kids', 'comments_enabled', 'created_at']

    def get_video_url(self, obj):
        if obj.video_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.video_file.url)
            return obj.video_file.url
        return None

class YouTubeTaskSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    device_number = serializers.CharField(source='device.phone_number', read_only=True)
    video_url = serializers.SerializerMethodField()

    class Meta:
        from .models import YouTubeTask
        model = YouTubeTask
        fields = [
            'id', 'device', 'device_name', 'device_number', 'video', 'video_file',
            'video_url', 'title', 'description', 'is_made_for_kids', 'comments_enabled',
            'status', 'created_at', 'processed_at'
        ]

    def get_video_url(self, obj):
        if obj.video_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.video_file.url)
            return obj.video_file.url
        elif obj.video and obj.video.video_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.video.video_file.url)
            return obj.video.video_file.url
        return None
