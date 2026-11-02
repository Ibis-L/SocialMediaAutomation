import shutil
import subprocess
import os
import sys
from django.conf import settings
from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .forms import TemplateConfigAdminForm
from .models import TemplateConfig, State, City, PortalState, PortalCity, ScrapedArticle, ReviewNote, WhatsAppDevice, DeviceContact, WhatsAppTask, AppRelease, TwitterTarget, TwitterTask

# ─────────────────────────────────────────────────────────
# Inline models for the News Portal edit page
# ─────────────────────────────────────────────────────────
class PortalStateInline(admin.TabularInline):
    model = PortalState
    extra = 1
    autocomplete_fields = ['state']
    verbose_name = "State Mapping"
    verbose_name_plural = "🗺️ State Mappings"
    fields = ('state', 'url_slug')


class PortalCityInline(admin.TabularInline):
    model = PortalCity
    extra = 1
    autocomplete_fields = ['city']
    verbose_name = "City Mapping"
    verbose_name_plural = "🏙️ City Mappings"
    fields = ('city', 'url_slug')


# ─────────────────────────────────────────────────────────
# State & City standalone admin
# ─────────────────────────────────────────────────────────

class CityInline(admin.TabularInline):
    model = City
    extra = 2
    verbose_name = "City"
    verbose_name_plural = "Cities in this State"


@admin.register(State)
class StateAdmin(admin.ModelAdmin):
    list_display = ('name', 'get_city_count')
    search_fields = ('name',)
    inlines = [CityInline]

    def get_city_count(self, obj):
        count = obj.cities.count()
        return format_html('<span style="font-weight:600;">{}</span>', count)
    get_city_count.short_description = 'Cities'


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ('name', 'state')
    list_filter = ('state',)
    search_fields = ('name', 'state__name')


# ─────────────────────────────────────────────────────────
# Helper: get the venv Python path
# ─────────────────────────────────────────────────────────

def _get_venv_python():
    """Return the venv python path, falling back to sys.executable."""
    project_dir = str(settings.BASE_DIR.parent)
    venv_python = os.path.join(project_dir, "venv", "bin", "python")
    if os.path.exists(venv_python):
        return venv_python
    return sys.executable


def _build_target_url(template):
    """
    Build a list of (target_url, core_keyword) tuples for a portal,
    respecting url_pattern with {state}/{city} placeholders.
    """
    targets = []

    if template.portal_type == 'state_and_city':
        state_mappings = list(template.portal_states.all())
        city_mappings = list(template.portal_cities.select_related('city').all())

        if not state_mappings and not city_mappings:
            # No mappings at all — just hit the base domain
            targets.append((f"https://{template.domain}", None))
        else:
            for pc in city_mappings:
                # Find the matching state mapping for this city
                state_slug = ""
                for ps in state_mappings:
                    if ps.state_id == pc.city.state_id:
                        state_slug = ps.url_slug
                        break

                city_slug = pc.url_slug
                keyword = city_slug.split('-')[0] if '-' in city_slug else city_slug

                if template.url_pattern:
                    url = template.url_pattern.replace("{state}", state_slug).replace("{city}", city_slug)
                else:
                    parts = [p for p in [state_slug, city_slug] if p]
                    url = f"https://{template.domain}/" + "/".join(parts) + "/"

                targets.append((url, keyword))

    elif template.portal_type == 'state_only':
        state_mappings = list(template.portal_states.all())
        if not state_mappings:
            targets.append((f"https://{template.domain}", None))
        else:
            for ps in state_mappings:
                keyword = ps.url_slug.split('-')[0] if '-' in ps.url_slug else ps.url_slug
                if template.url_pattern:
                    url = template.url_pattern.replace("{state}", ps.url_slug).replace("{city}", "")
                else:
                    url = f"https://{template.domain}/{ps.url_slug}/"
                targets.append((url, keyword))

    else:  # city_only
        city_mappings = list(template.portal_cities.all())
        if not city_mappings:
            targets.append((f"https://{template.domain}", None))
        else:
            for pc in city_mappings:
                keyword = pc.url_slug.split('-')[0] if '-' in pc.url_slug else pc.url_slug
                if template.url_pattern:
                    url = template.url_pattern.replace("{city}", pc.url_slug).replace("{state}", "")
                else:
                    url = f"https://{template.domain}/{pc.url_slug}/"
                targets.append((url, keyword))

    return targets


# ─────────────────────────────────────────────────────────
# Run Scraper Admin Action
# ─────────────────────────────────────────────────────────

@admin.action(description="▶ Run Scraper on Selected Portals")
def run_scraper_action(modeladmin, request, queryset):
    project_dir = str(settings.BASE_DIR.parent)
    main_py_path = os.path.join(project_dir, "main.py")
    venv_python = _get_venv_python()

    for template in queryset:
        # Clear old output before scraping
        clean_domain = template.domain.replace("www.", "")
        site_name = clean_domain.split('.')[0]
        output_site_dir = os.path.join(project_dir, "output", site_name)
        if os.path.exists(output_site_dir):
            shutil.rmtree(output_site_dir)

        targets = _build_target_url(template)
        for target_url, keyword in targets:
            cmd = [venv_python, main_py_path, "--url", target_url, "--count", "3"]
            if keyword:
                cmd.extend(["--keyword", keyword])
            subprocess.Popen(cmd, cwd=project_dir)


# ─────────────────────────────────────────────────────────
# News Portal Admin (the main star)
# ─────────────────────────────────────────────────────────

@admin.register(TemplateConfig)
class TemplateConfigAdmin(admin.ModelAdmin):
    form = TemplateConfigAdminForm
    list_display = ('name', 'domain', 'get_portal_type_badge', 'get_locations_summary')
    list_filter = ('portal_type',)
    search_fields = ('name', 'domain')
    actions = [run_scraper_action]

    fieldsets = (
        ('Portal Information', {
            'fields': ('name', 'portal_type', 'url_pattern'),
        }),
        ('Template JSON — Paste Config Here', {
            'fields': ('template_json',),
            'description': 'Paste the scraper template dictionary as JSON. On save, the Domain, URL Identifier, and Selectors fields below will be auto-populated.',
        }),
        ('Auto-filled from Template (read-only)', {
            'fields': ('domain', 'url_identifier', 'selectors'),
            'classes': ('collapse',),
            'description': 'These fields are automatically filled when you paste a Template JSON above. Expand only to inspect.',
        }),
    )

    readonly_fields = ('domain', 'url_identifier', 'selectors')

    class Media:
        js = ('masters/js/auto_slug.js',)

    def get_inlines(self, request, obj=None):
        """Dynamically show the right inline based on portal_type."""
        if obj is None:
            # New object — show both so user can fill whichever they need
            return [PortalStateInline, PortalCityInline]
        if obj.portal_type == 'state_only':
            return [PortalStateInline]
        elif obj.portal_type == 'city_only':
            return [PortalCityInline]
        else:  # state_and_city
            return [PortalStateInline, PortalCityInline]

    def get_portal_type_badge(self, obj):
        colors = {
            'city_only': ('#28a745', '🏙️ City Only'),
            'state_only': ('#007bff', '🗺️ State Only'),
            'state_and_city': ('#6f42c1', '🗺️🏙️ State + City'),
        }
        color, label = colors.get(obj.portal_type, ('#6c757d', obj.portal_type))
        return format_html(
            '<span style="background:{}; color:#fff; padding:3px 10px; border-radius:12px; font-size:12px; font-weight:600;">{}</span>',
            color, label
        )
    get_portal_type_badge.short_description = 'Type'

    def get_locations_summary(self, obj):
        states = list(obj.portal_states.select_related('state').all())
        cities = list(obj.portal_cities.select_related('city').all())
        parts = []
        if states:
            names = ', '.join([ps.state.name for ps in states[:3]])
            if len(states) > 3:
                names += f' +{len(states) - 3} more'
            parts.append(format_html('<b>States:</b> {}', names))
        if cities:
            names = ', '.join([pc.city.name for pc in cities[:3]])
            if len(cities) > 3:
                names += f' +{len(cities) - 3} more'
            parts.append(format_html('<b>Cities:</b> {}', names))
        if not parts:
            return mark_safe('<span style="color:#999;">— No locations mapped —</span>')
        return mark_safe('<br>'.join(parts))
    get_locations_summary.short_description = 'Mapped Locations'

class ReviewNoteInline(admin.TabularInline):
    model = ReviewNote
    extra = 1
    fields = ('text', 'user', 'created_at')
    readonly_fields = ('user', 'created_at')

@admin.register(ScrapedArticle)
class ScrapedArticleAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'template', 'scraped_at')
    list_filter = ('status', 'template', 'scraped_at')
    search_fields = ('title', 'source_url')
    readonly_fields = ('template', 'source_url', 'title', 'content', 'scraped_at')
    inlines = [ReviewNoteInline]

    def get_readonly_fields(self, request, obj=None):
        fields = list(super().get_readonly_fields(request, obj))
        if request.user.groups.filter(name='Viewer/Reporter').exists():
            return [f.name for f in self.model._meta.fields]
        return fields

    def save_formset(self, request, form, formset, change):
        if formset.model == ReviewNote:
            instances = formset.save(commit=False)
            for instance in instances:
                if not instance.pk:
                    instance.user = request.user
                instance.save()
            formset.save_m2m()
        else:
            super().save_formset(request, form, formset, change)

class DeviceContactInline(admin.TabularInline):
    model = DeviceContact
    extra = 1

@admin.register(WhatsAppDevice)
class WhatsAppDeviceAdmin(admin.ModelAdmin):
    list_display = ('phone_number', 'name', 'twitter_handle', 'battery_level', 'last_heartbeat', 'created_at')
    search_fields = ('phone_number', 'name', 'twitter_handle')
    inlines = [DeviceContactInline]

@admin.register(WhatsAppTask)
class WhatsAppTaskAdmin(admin.ModelAdmin):
    list_display = ('device', 'contact_number', 'status', 'created_at', 'processed_at')
    list_filter = ('status', 'device')
    search_fields = ('contact_number', 'message', 'device__phone_number')

@admin.register(TwitterTarget)
class TwitterTargetAdmin(admin.ModelAdmin):
    list_display = ('handle', 'name', 'category', 'device', 'created_at')
    list_filter = ('category', 'device')
    search_fields = ('handle', 'name', 'notes')

@admin.register(TwitterTask)
class TwitterTaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'device', 'task_type', 'target_handle', 'status', 'created_at', 'processed_at')
    list_filter = ('status', 'task_type', 'device')
    search_fields = ('target_handle', 'content', 'result_message')

@admin.register(AppRelease)
class AppReleaseAdmin(admin.ModelAdmin):
    list_display = ['version_name', 'version_code', 'is_mandatory', 'created_at']
    list_filter = ['is_mandatory']
    search_fields = ['version_name', 'release_notes']
