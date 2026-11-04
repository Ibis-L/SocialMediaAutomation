import secrets
import random
from datetime import timedelta
from django.db import models
from django.core.exceptions import ValidationError
from django.utils.text import slugify
from django.contrib.auth.models import User
from django.utils import timezone


class State(models.Model):
    name = models.CharField(max_length=100, unique=True, help_text="e.g., Uttar Pradesh")

    class Meta:
        ordering = ['name']
        verbose_name = 'State'
        verbose_name_plural = 'States'

    def __str__(self):
        return self.name


class City(models.Model):
    name = models.CharField(max_length=100, help_text="e.g., Lucknow")
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name='cities')

    class Meta:
        ordering = ['state__name', 'name']
        verbose_name = 'City'
        verbose_name_plural = 'Cities'
        unique_together = ('name', 'state')

    def __str__(self):
        return f"{self.name}, {self.state.name}"


class TemplateConfig(models.Model):

    PORTAL_TYPE_CHOICES = [
        ('city_only', 'City Based — URL uses city only'),
        ('state_only', 'State Based — URL uses state only'),
        ('state_and_city', 'State + City — URL uses both state and city'),
    ]

    name = models.CharField(max_length=200, help_text="e.g., AajTak")
    domain = models.CharField(max_length=200, help_text="e.g., aajtak.in", unique=True)
    url_identifier = models.CharField(max_length=200, help_text="e.g., /story/")
    portal_type = models.CharField(
        max_length=20,
        choices=PORTAL_TYPE_CHOICES,
        default='city_only',
        help_text="Determines how the scraper constructs target URLs for this portal."
    )

    # URL pattern with {state} and {city} placeholders
    url_pattern = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text='URL template with placeholders. Use {state} and {city}. Example: https://bhaskar.com/{state}/{city}/'
    )

    # Store all DOM CSS selectors in a flexible JSON structure
    selectors = models.JSONField(
        help_text='JSON containing all selectors, e.g., {"homepage_links": "a", "title": "h1"}'
    )

    # Dashboard Fields
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Pause', 'Pause'),
        ('Error', 'Error'),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    last_scraped_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = "News Portal"
        verbose_name_plural = "News Portals"

    def __str__(self):
        return self.name or self.domain


class PortalState(models.Model):
    """Links a News Portal to a State with a custom URL slug."""
    portal = models.ForeignKey(TemplateConfig, on_delete=models.CASCADE, related_name='portal_states')
    state = models.ForeignKey(State, on_delete=models.CASCADE)
    url_slug = models.CharField(
        max_length=200,
        blank=True,
        help_text="Auto-generated from state name. Override only if the portal uses a custom slug."
    )

    class Meta:
        unique_together = ('portal', 'state')
        verbose_name = 'Portal State Mapping'
        verbose_name_plural = 'Portal State Mappings'

    def clean(self):
        # Prevent accidental URL/domain entry in slug field
        if self.url_slug and ('.' in self.url_slug or '/' in self.url_slug or ':' in self.url_slug):
            raise ValidationError({'url_slug': 'Slug must not contain dots, slashes, or colons. It should be a simple slug like "rajasthan".'})

    def save(self, *args, **kwargs):
        if not self.url_slug:
            self.url_slug = slugify(self.state.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.portal.name} → {self.state.name}"


class PortalCity(models.Model):
    """Links a News Portal to a City with a custom URL slug."""
    portal = models.ForeignKey(TemplateConfig, on_delete=models.CASCADE, related_name='portal_cities')
    city = models.ForeignKey(City, on_delete=models.CASCADE)
    url_slug = models.CharField(
        max_length=200,
        blank=True,
        help_text="Auto-generated from city name. Override only if the portal uses a custom slug."
    )

    class Meta:
        unique_together = ('portal', 'city')
        verbose_name = 'Portal City Mapping'
        verbose_name_plural = 'Portal City Mappings'

    def clean(self):
        # Prevent accidental URL/domain entry in slug field
        if self.url_slug and ('.' in self.url_slug or '/' in self.url_slug or ':' in self.url_slug):
            raise ValidationError({'url_slug': 'Slug must not contain dots, slashes, or colons. It should be a simple slug like "kota".'})

    def save(self, *args, **kwargs):
        if not self.url_slug:
            self.url_slug = slugify(self.city.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.portal.name} → {self.city.name}"

class ScrapedArticle(models.Model):
    STATUS_CHOICES = (
        ('SCRAPED', 'Scraped News'),
        ('AI_REWRITTEN', 'AI Rewritten'),
        ('WRITER_REVIEW', 'Writer Review'),
        ('EDITOR_VERIFICATION', 'Editor Verification'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('PUBLISHED', 'Published'),
    )

    template = models.ForeignKey(TemplateConfig, on_delete=models.CASCADE, null=True, blank=True)
    source_url = models.URLField(max_length=1000)
    title = models.CharField(max_length=500, blank=True, null=True)
    title_hash = models.CharField(max_length=64, unique=True, null=True, blank=True, help_text="SHA-256 hash of normalized title for fast deduplication")
    content = models.JSONField(help_text="Full extracted JSON payload")
    scraped_at = models.DateTimeField(auto_now_add=True)

    # --- Editorial Fields ---
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    edited_content = models.TextField(blank=True, null=True, help_text="Human edited text")
    cover_image = models.ImageField(upload_to="covers/", blank=True, null=True)
    seo_title = models.CharField(max_length=500, blank=True, null=True)
    seo_desc = models.TextField(blank=True, null=True)
    seo_keywords = models.CharField(max_length=500, blank=True, null=True)
    sentiment = models.CharField(max_length=50, default='Neutral')
    readability = models.IntegerField(default=0)
    seo_score = models.IntegerField(default=0)

    class Meta:
        verbose_name = "Scraped Article"
        verbose_name_plural = "Scraped Articles"
        ordering = ['-scraped_at']

    def __str__(self):
        return self.title or self.source_url

class ScrapeLog(models.Model):
    STATUS_CHOICES = (
        ('NEW', 'New'),
        ('DUPE', 'Duplicate'),
        ('ERROR', 'Error'),
    )
    template = models.ForeignKey(TemplateConfig, on_delete=models.CASCADE, null=True, blank=True)
    url = models.URLField(max_length=1000)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.status} - {self.url}"


class ReviewNote(models.Model):
    article = models.ForeignKey(ScrapedArticle, on_delete=models.CASCADE, related_name='review_notes')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField(help_text="e.g. 'Rewrite headline', 'Add image', 'Verify facts'")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Review Note"
        verbose_name_plural = "Review Notes"

    def __str__(self):
        return f"{self.user.username} on {self.article.title}"

class WhatsAppDevice(models.Model):
    phone_number = models.CharField(max_length=20, unique=True, help_text="e.g., +919876543210")
    name = models.CharField(max_length=100, blank=True, null=True, help_text="Optional name for this device (e.g., Sales Device 1)")
    twitter_handle = models.CharField(max_length=100, blank=True, null=True, help_text="Optional Twitter/X handle configured on this device (e.g. @SSLocalNews)")
    api_token = models.CharField(max_length=64, unique=True, blank=True, null=True, help_text="Secret token for device authentication")
    
    # Device Monitoring Fields
    battery_level = models.IntegerField(null=True, blank=True, help_text="Battery percentage (0-100)")
    battery_status = models.CharField(max_length=50, null=True, blank=True, help_text="e.g. Charging, Discharging")
    temperature = models.FloatField(null=True, blank=True, help_text="Device temperature in Celsius")
    last_heartbeat = models.DateTimeField(null=True, blank=True, help_text="Last time the device pinged the server")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "WhatsApp Device"
        verbose_name_plural = "WhatsApp Devices"
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.api_token:
            self.api_token = secrets.token_hex(32)
        super().save(*args, **kwargs)

    def __str__(self):
        desc = self.name or self.phone_number
        if self.twitter_handle:
            desc += f" [{self.twitter_handle}]"
        return desc

class DeviceContact(models.Model):
    device = models.ForeignKey(WhatsAppDevice, on_delete=models.CASCADE, related_name='contacts')
    phone_number = models.CharField(max_length=20, help_text="e.g., +919876543210")
    name = models.CharField(max_length=100, blank=True, null=True, help_text="Contact name")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Device Contact"
        verbose_name_plural = "Device Contacts"
        unique_together = ('device', 'phone_number')
        ordering = ['name', 'phone_number']

    def __str__(self):
        return f"{self.name} ({self.phone_number})" if self.name else self.phone_number

# ─────────────────────────────────────────────────────────────────────────────
# INSTAGRAM CONTENT TASKS (Posts, Stories, Reels — separate from DM)
# ─────────────────────────────────────────────────────────────────────────────

class InstagramTask(models.Model):
    TASK_TYPE_CHOICES = (
        ('POST', 'Feed Post (image/video/carousel)'),
        ('STORY', 'Story (image or video)'),
        ('REEL', 'Reel (video)'),
    )
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    )

    device = models.ForeignKey(
        'WhatsAppDevice', on_delete=models.CASCADE, related_name='instagram_tasks'
    )
    task_type = models.CharField(max_length=10, choices=TASK_TYPE_CHOICES, default='POST')
    caption = models.TextField(blank=True, default='', help_text="Caption for Post/Story/Reel")
    hashtags = models.TextField(blank=True, default='', help_text="Hashtags to append (space-separated, with or without #)")
    article = models.ForeignKey(
        'ScrapedArticle', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='instagram_tasks', help_text="Optional linked news article"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Instagram Task"
        verbose_name_plural = "Instagram Tasks"
        ordering = ['-created_at']

    def __str__(self):
        return f"Instagram {self.task_type} via {self.device} ({self.status})"

    def full_caption(self):
        """Returns caption with hashtags appended."""
        parts = [self.caption] if self.caption else []
        if self.hashtags:
            tags = self.hashtags.strip()
            # Ensure each tag starts with #
            normalized = ' '.join(
                t if t.startswith('#') else f'#{t}'
                for t in tags.replace(',', ' ').split()
                if t
            )
            if normalized:
                parts.append(normalized)
        return '\n\n'.join(parts)


class InstagramMedia(models.Model):
    MEDIA_TYPE_CHOICES = (
        ('image', 'Image'),
        ('video', 'Video'),
    )
    task = models.ForeignKey(
        InstagramTask, on_delete=models.CASCADE, related_name='media_files'
    )
    file = models.FileField(upload_to='instagram_media/', help_text="Uploaded image or video file")
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICES, default='image')
    order = models.PositiveIntegerField(default=0, help_text="Order in carousel (0 = first)")

    class Meta:
        verbose_name = "Instagram Media File"
        verbose_name_plural = "Instagram Media Files"
        ordering = ['order']

    def __str__(self):
        return f"{self.media_type} #{self.order} for task {self.task_id}"


# ─────────────────────────────────────────────────────────────────────────────
# TWITTER MEDIA FILES (for tweets with attached images)
# ─────────────────────────────────────────────────────────────────────────────

class TwitterMedia(models.Model):
    task = models.ForeignKey(
        'TwitterTask', on_delete=models.CASCADE, related_name='media_files'
    )
    file = models.FileField(upload_to='twitter_media/', help_text="Image to attach to tweet (max 4)")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Twitter Media File"
        verbose_name_plural = "Twitter Media Files"
        ordering = ['order']

    def __str__(self):
        return f"Twitter media #{self.order} for task {self.task_id}"


class WhatsAppTask(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed')
    )
    
    device = models.ForeignKey(WhatsAppDevice, on_delete=models.CASCADE, related_name='tasks')
    contact_number = models.CharField(max_length=500, help_text="Target phone number or profile/share URL")
    message = models.TextField()
    platform = models.CharField(max_length=20, default='whatsapp', help_text="Target platform, e.g. whatsapp, instagram")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "WhatsApp Task"
        verbose_name_plural = "WhatsApp Tasks"
        ordering = ['created_at']

    def __str__(self):
        return f"Task for {self.contact_number} via {self.device.phone_number} ({self.status})"

class TwitterTarget(models.Model):
    device = models.ForeignKey(WhatsAppDevice, on_delete=models.CASCADE, related_name='twitter_targets', null=True, blank=True, help_text="Optional device association")
    handle = models.CharField(max_length=100, help_text="Target Twitter/X ID or handle (e.g. @techinsider or techinsider)")
    name = models.CharField(max_length=150, blank=True, null=True, help_text="Display or contact name")
    category = models.CharField(max_length=100, blank=True, null=True, default="General", help_text="Category tag e.g. Media, Tech, Influencer")
    notes = models.TextField(blank=True, null=True, help_text="Additional notes or biography")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Twitter Target Handle"
        verbose_name_plural = "Twitter Target Handles"
        ordering = ['handle']

    def clean(self):
        # Normalize handle to always start with @
        if self.handle and not self.handle.startswith('@'):
            self.handle = f"@{self.handle.strip()}"

    def save(self, *args, **kwargs):
        if self.handle and not self.handle.startswith('@'):
            self.handle = f"@{self.handle.strip()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.handle} ({self.name})" if self.name else self.handle

class TwitterTask(models.Model):
    TASK_TYPE_CHOICES = (
        ('DM', 'Direct Message (with Auto-Follow Fallback)'),
        ('TWEET', 'Custom Tweet Post'),
    )

    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FOLLOWED_FALLBACK', 'Followed (Fallback - DM Closed)'),
        ('FAILED', 'Failed'),
    )

    device = models.ForeignKey(WhatsAppDevice, on_delete=models.CASCADE, related_name='twitter_tasks')
    task_type = models.CharField(max_length=20, choices=TASK_TYPE_CHOICES, default='DM')
    target_handle = models.CharField(max_length=100, blank=True, null=True, help_text="Target Twitter handle for DMs (e.g. @elonmusk)")
    content = models.TextField(help_text="News payload for DM or custom tweet text to post")
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='PENDING')
    result_message = models.TextField(blank=True, null=True, help_text="Execution details reported by Android companion app")
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Twitter Task"
        verbose_name_plural = "Twitter Tasks"
        ordering = ['-created_at']

    def __str__(self):
        if self.task_type == 'TWEET':
            return f"Tweet via {self.device} ({self.status})"
        return f"DM to {self.target_handle} via {self.device} ({self.status})"

class AppRelease(models.Model):
    version_code = models.IntegerField(help_text="Integer version code (e.g. 2)")
    version_name = models.CharField(max_length=50, help_text="String version name (e.g. 1.0.1)")
    apk_file = models.FileField(upload_to="releases/", help_text="Upload the app-release.apk file")
    release_notes = models.TextField(blank=True, null=True)
    is_mandatory = models.BooleanField(default=True, help_text="Force users to update?")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-version_code']

    def __str__(self):
        return f"Version {self.version_name} ({self.version_code})"


class YouTubeVideo(models.Model):
    title = models.CharField(max_length=255, help_text="Title of the video")
    description = models.TextField(blank=True, null=True, help_text="Description for YouTube")
    video_file = models.FileField(upload_to="youtube_library/", help_text="Uploaded MP4 video")
    is_made_for_kids = models.BooleanField(default=True, help_text="Is this video made for kids? (Default True)")
    comments_enabled = models.BooleanField(default=True, help_text="Are comments allowed? (Default True)")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "YouTube Video"
        verbose_name_plural = "YouTube Videos"

    def __str__(self):
        return self.title


class YouTubeTask(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('DOWNLOADING', 'Downloading'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed')
    )

    device = models.ForeignKey(WhatsAppDevice, on_delete=models.CASCADE, related_name='youtube_tasks')
    video = models.ForeignKey(YouTubeVideo, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    video_file = models.FileField(upload_to="youtube_uploads/", help_text="Video file to upload to YouTube", blank=True, null=True)
    title = models.CharField(max_length=255, help_text="Title for the YouTube video")
    description = models.TextField(blank=True, null=True, help_text="Description for the YouTube video")
    is_made_for_kids = models.BooleanField(default=True)
    comments_enabled = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "YouTube Task"
        verbose_name_plural = "YouTube Tasks"
        ordering = ['-created_at']

    def __str__(self):
        return f"YouTube '{self.title}' on {self.device} ({self.status})"


class PasswordResetOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_otps')
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Password Reset OTP"
        verbose_name_plural = "Password Reset OTPs"
        ordering = ['-created_at']

    def __str__(self):
        return f"OTP for {self.user.username} ({self.otp_code}) - Used: {self.is_used}"

    def is_valid(self):
        return not self.is_used and timezone.now() <= self.expires_at

    @classmethod
    def generate_otp_for_user(cls, user):
        # Invalidate any existing unused OTPs
        cls.objects.filter(user=user, is_used=False).update(is_used=True)
        code = f"{random.randint(100000, 999999)}"
        expiry = timezone.now() + timedelta(minutes=10)
        return cls.objects.create(user=user, otp_code=code, expires_at=expiry)
