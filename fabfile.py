from os import path
from fabric.api import run, put, env, local
from fabric.main import load_settings
from fabric.contrib.project import rsync_project


env.app_dir = path.join(path.dirname(__file__), 'app')

# load rc file: https://github.com/fabric/fabric/pull/586
settings = load_settings('.fabricrc')
if not settings:
    raise RuntimeError('.fabricrc is needed')
env.update(settings)
env.hosts = [env.deploy_host]



def assets():
    local('webassets -c assets.yml build --production')


def deploy():
    assets()

    rsync_project(
        local_dir=env.app_dir + path.sep,
        remote_dir=env.target_path,
        exclude=[
            '.*',
            '/js',
            '/css'])