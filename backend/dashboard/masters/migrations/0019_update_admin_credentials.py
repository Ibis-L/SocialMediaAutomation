from django.db import migrations
from django.contrib.auth.hashers import make_password

def update_admin_credentials(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    Group = apps.get_model('auth', 'Group')
    
    try:
        admin = User.objects.get(username='admin')
        admin.username = 'Admin'
    except User.DoesNotExist:
        try:
            admin = User.objects.get(username='Admin')
        except User.DoesNotExist:
            admin = User(username='Admin', is_staff=True, is_superuser=True, is_active=True)
            
    admin.password = make_password('Admin123')
    admin.save()
    
    try:
        super_admin_group = Group.objects.get(name='Super Admin')
        admin.groups.add(super_admin_group)
    except Group.DoesNotExist:
        pass

class Migration(migrations.Migration):
    dependencies = [
        ('masters', '0018_reset_admin_password'),
    ]

    operations = [
        migrations.RunPython(update_admin_credentials),
    ]
