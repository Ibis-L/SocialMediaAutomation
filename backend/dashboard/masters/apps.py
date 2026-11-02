from django.apps import AppConfig
from django.db.models.signals import post_migrate

def create_default_groups(sender, **kwargs):
    from django.contrib.auth.models import Group
    groups = ['Super Admin', 'Editor', 'News Writer', 'Publisher', 'Viewer/Reporter']
    for group_name in groups:
        Group.objects.get_or_create(name=group_name)


class MastersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'masters'

    def ready(self):
        post_migrate.connect(create_default_groups, sender=self)
