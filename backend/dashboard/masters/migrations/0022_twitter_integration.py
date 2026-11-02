# Generated manually for Twitter (X) Integration
import django.db.models.deletion
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('masters', '0021_passwordresetotp'),
    ]

    operations = [
        migrations.AddField(
            model_name='whatsappdevice',
            name='twitter_handle',
            field=models.CharField(
                blank=True,
                help_text='Optional Twitter/X handle configured on this device (e.g. @SSLocalNews)',
                max_length=100,
                null=True
            ),
        ),
        migrations.CreateModel(
            name='TwitterTarget',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('handle', models.CharField(help_text='Target Twitter/X ID or handle (e.g. @techinsider or techinsider)', max_length=100)),
                ('name', models.CharField(blank=True, help_text='Display or contact name', max_length=150, null=True)),
                ('category', models.CharField(blank=True, default='General', help_text='Category tag e.g. Media, Tech, Influencer', max_length=100, null=True)),
                ('notes', models.TextField(blank=True, help_text='Additional notes or biography', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('device', models.ForeignKey(
                    blank=True,
                    help_text='Optional device association',
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='twitter_targets',
                    to='masters.whatsappdevice'
                )),
            ],
            options={
                'verbose_name': 'Twitter Target Handle',
                'verbose_name_plural': 'Twitter Target Handles',
                'ordering': ['handle'],
            },
        ),
        migrations.CreateModel(
            name='TwitterTask',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('task_type', models.CharField(
                    choices=[('DM', 'Direct Message (with Auto-Follow Fallback)'), ('TWEET', 'Custom Tweet Post')],
                    default='DM',
                    max_length=20
                )),
                ('target_handle', models.CharField(
                    blank=True,
                    help_text='Target Twitter handle for DMs (e.g. @elonmusk)',
                    max_length=100,
                    null=True
                )),
                ('content', models.TextField(help_text='News payload for DM or custom tweet text to post')),
                ('status', models.CharField(
                    choices=[
                        ('PENDING', 'Pending'),
                        ('PROCESSING', 'Processing'),
                        ('COMPLETED', 'Completed'),
                        ('FOLLOWED_FALLBACK', 'Followed (Fallback - DM Closed)'),
                        ('FAILED', 'Failed')
                    ],
                    default='PENDING',
                    max_length=25
                )),
                ('result_message', models.TextField(blank=True, help_text='Execution details reported by Android companion app', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('processed_at', models.DateTimeField(blank=True, null=True)),
                ('device', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='twitter_tasks',
                    to='masters.whatsappdevice'
                )),
            ],
            options={
                'verbose_name': 'Twitter Task',
                'verbose_name_plural': 'Twitter Tasks',
                'ordering': ['-created_at'],
            },
        ),
    ]
