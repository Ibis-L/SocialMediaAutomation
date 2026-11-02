from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from masters.models import ScrapedArticle, ReviewNote, TemplateConfig

class Command(BaseCommand):
    help = 'Create user groups and assign permissions for the News Approval Workflow'

    def handle(self, *args, **kwargs):
        # 1. Editor
        editor_group, _ = Group.objects.get_or_create(name='Editor')
        article_ct = ContentType.objects.get_for_model(ScrapedArticle)
        note_ct = ContentType.objects.get_for_model(ReviewNote)
        
        editor_perms = Permission.objects.filter(
            content_type__in=[article_ct, note_ct],
            codename__in=[
                'view_scrapedarticle', 'change_scrapedarticle', 'add_scrapedarticle',
                'view_reviewnote', 'add_reviewnote', 'change_reviewnote', 'delete_reviewnote'
            ]
        )
        editor_group.permissions.set(editor_perms)

        # 2. News Writer
        writer_group, _ = Group.objects.get_or_create(name='News Writer')
        writer_perms = Permission.objects.filter(
            content_type__in=[article_ct, note_ct],
            codename__in=[
                'view_scrapedarticle', 'change_scrapedarticle', 'add_scrapedarticle',
                'view_reviewnote', 'add_reviewnote'
            ]
        )
        writer_group.permissions.set(writer_perms)

        # 3. Publisher
        publisher_group, _ = Group.objects.get_or_create(name='Publisher')
        publisher_perms = Permission.objects.filter(
            content_type__in=[article_ct],
            codename__in=['view_scrapedarticle', 'change_scrapedarticle']
        )
        publisher_group.permissions.set(publisher_perms)

        # 4. Viewer/Reporter
        viewer_group, _ = Group.objects.get_or_create(name='Viewer/Reporter')
        viewer_perms = Permission.objects.filter(
            content_type__in=[article_ct],
            codename__in=['view_scrapedarticle']
        )
        viewer_group.permissions.set(viewer_perms)
        
        self.stdout.write(self.style.SUCCESS('Successfully created User Groups and assigned Permissions.'))

