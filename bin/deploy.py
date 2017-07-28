#!/usr/bin/env python
#coding=utf-8

import os
import sys
import argparse

from fabric.api import env
from fabric.operations import local, run, put
from fabric.context_managers import lcd, cd
from fabric.contrib.project import rsync_project

PROJECT_PATH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# region ---- deploy
def __deploy_from_command_line():
    global arguments
    environment = arguments['environment']
    __deploy(environment)


def __deploy(environment):
    env.user = "root"
    env.host_string = 'root@collaborativejs.org'
    name = 'text.collaborativejs.org' if environment == 'production' else 'text.collaborativejs.stg'

    remote_dir = '/apps/%s' % name

    # sync project files
    rsync_project(
        remote_dir=remote_dir,
        local_dir=PROJECT_PATH + '/',
        exclude=["bin", ".git", ".gitignore", ".DS_Store", ".idea", "circle.yml", "node_modules"],
        delete=True
    )

    # install project dependencies
    with cd(remote_dir):
        run('npm install')

    # restart supervisor
    run('supervisorctl restart %s' % name)

# endregion


if __name__ == "__main__":
    # region ---- init parser
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(help='Build script commands')
    # endregion

    # region ---- deploy
    deploy = subparsers.add_parser('deploy', help='Deploy project')
    deploy.add_argument('-e', '--environment', action='store', default='staging', help='Define deploy environment')
    # endregion

    # region ---- switch

    global arguments
    arguments = vars(parser.parse_args())
    command = sys.argv[1]

    if command == 'deploy':
        __deploy_from_command_line()
    # endregion

