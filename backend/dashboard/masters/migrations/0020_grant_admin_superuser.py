from django.db import migrations

def grant_superuser_permissions(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    try:
        admin = User.objects.get(username='Admin')
        admin.is_staff = True
        admin.is_superuser = True
        admin.is_active = True
        admin.save()
    except User.DoesNotExist:
        pass

class Migration(migrations.Migration):
    dependencies = [
        ('masters', '0019_update_admin_credentials'),
    ]

    operations = [
        migrations.RunPython(grant_superuser_permissions),
    ]
