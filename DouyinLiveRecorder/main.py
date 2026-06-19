# -*- encoding: utf-8 -*-

"""
Author: Hmily
GitHub: https://github.com/ihmily
Date: 2023-07-17 23:52:05
Update: 2025-10-23 19:48:05
Copyright (c) 2023-2025 by Hmily, All Rights Reserved.
Function: Record live stream video.
"""
import asyncio
import os
import sys
import builtins
import subprocess
import signal
import threading
import time
import datetime
import re
import shutil
import random
import uuid
from pathlib import Path
import urllib.request
from urllib.error import URLError, HTTPError
from typing import Any
import configparser
import httpx
from src import spider, stream
from src.proxy import ProxyDetector
from src.utils import logger
from src import utils
from msg_push import (
    dingtalk, xizhi, tg_bot, send_email, bark, ntfy, pushplus
)
from ffmpeg_install import (
    check_ffmpeg, ffmpeg_path, current_env_path
)

version = "v4.0.7"
platforms = ("\u56fd\u5185\u7ad9\u70b9\uff1a\u6296\u97f3|\u5feb\u624b|\u864e\u7259|\u6597\u9c7c|YY|B\u7ad9|\u5c0f\u7ea2\u4e66|bigo|blued|\u7f51\u6613CC|\u5343\u5ea6\u70ed\u64ad|\u732b\u8033FM|Look|TwitCasting|\u767e\u5ea6|\u5fae\u535a|"
             "\u9177\u72d7|\u82b1\u6912|\u6d41\u661f|Acfun|\u7545\u804a|\u6620\u5ba2|\u97f3\u64ad|\u77e5\u4e4e|\u55e8\u79c0|VV\u661f\u7403|17Live|\u6d6aLive|\u6f02\u6f02|\u516d\u95f4\u623f|\u4e50\u55e8|\u82b1\u732b|\u6dd8\u5b9d|\u4eac\u4e1c|\u549c\u549c|\u8fde\u63a5|\u6765\u79c0"
             "\n\u6d77\u5916\u7ad9\u70b9\uff1aTikTok|SOOP|PandaTV|WinkTV|FlexTV|PopkonTV|TwitchTV|LiveMe|ShowRoom|CHZZK|Shopee|"
             "Youtube|Faceit|Picarto")

recording = set()
error_count = 0
pre_max_request = 10
max_request_lock = threading.Lock()
error_window = []
error_window_size = 10
error_threshold = 5
monitoring = 0
running_list = []
url_tuples_list = []
url_comments = []
text_no_repeat_url = []
create_var = locals()
first_start = True
exit_recording = False
need_update_line_list = []
first_run = True
not_record_list = []
start_display_time = datetime.datetime.now()
global_proxy = False
recording_time_list = {}
script_path = os.path.split(os.path.realpath(sys.argv[0]))[0]
config_file = f'{script_path}/config/config.ini'
url_config_file = f'{script_path}/config/URL_config.ini'
backup_dir = f'{script_path}/backup_config'
text_encoding = 'utf-8-sig'
rstr = r"[\/\\\:\*\uff1f?\"\<\>\|&#.\uff0c\uff0c ~\uff01\u00b7\u00a0]"
default_path = f'{script_path}/downloads'
os.makedirs(default_path, exist_ok=True)
file_update_lock = threading.Lock()
os_type = os.name
clear_command = "cls" if os_type == 'nt' else "clear"
color_obj = utils.Color()
os.environ['PATH'] = ffmpeg_path + os.pathsep + current_env_path


def signal_handler(_signal, _frame):
    sys.exit(0)


signal.signal(signal.SIGTERM, signal_handler)


def display_info() -> None:
    global start_display_time
    time.sleep(5)
    while True:
        try:
            sys.stdout.flush()
            time.sleep(5)
            if Path(sys.executable).name != 'pythonw.exe':
                os.system(clear_command)
            print(f"\r\u5171\u76d1\u6d4b{monitoring}\u4e2a\u76f4\u64ad\u4e2d", end=" | ")
            print(f"\u540c\u4e00\u65f6\u95f4\u8bbf\u95ee\u7f51\u7edc\u7684\u7ebf\u7a0b\u6570: {max_request}", end=" | ")
            print(f"\u662f\u5426\u5f00\u542f\u4ee3\u7406\u5f55\u5236: {'\u662f' if use_proxy else '\u5426'}", end=" | ")
            if split_video_by_time:
                print(f"\u5f55\u5236\u5206\u6bb5\u5f00\u542f: {split_time}\u79d2", end=" | ")
            else:
                print("\u5f55\u5236\u5206\u6bb5\u5f00\u542f: \u5426", end=" | ")
            if create_time_file:
                print("\u662f\u5426\u751f\u6210\u65f6\u95f4\u6587\u4ef6: \u662f", end=" | ")
            print(f"\u5f55\u5236\u89c6\u9891\u8d28\u91cf\u4e3a: {video_record_quality}", end=" | ")
            print(f"\u5f55\u5236\u89c6\u9891\u683c\u5f0f\u4e3a: {video_save_type}", end=" | ")
            print(f"\u76ee\u524d\u77ac\u65f6\u9519\u8bef\u6570\u4e3a: {error_count}", end=" | ")
            now = time.strftime("%H:%M:%S", time.localtime())
            print(f"\u5f53\u524d\u65f6\u95f4: {now}")

            if len(recording) == 0:
                time.sleep(5)
                if monitoring == 0:
                    print("\r\u6ca1\u6709\u6b63\u5728\u76d1\u6d4b\u548c\u5f55\u5236\u7684\u76f4\u64ad")
                else:
                    print(f"\r\u6ca1\u6709\u6b63\u5728\u5f55\u5236\u7684\u76f4\u64ad \u5faa\u73af\u76d1\u6d4b\u95f4\u9694\u65f6\u95f4\uff1a{delay_default}\u79d2")
            else:
                now_time = datetime.datetime.now()
                print("x" * 60)
                no_repeat_recording = list(set(recording))
                print(f"\u6b63\u5728\u5f55\u5236{len(no_repeat_recording)}\u4e2a\u76f4\u64ad: ")
                for recording_live in no_repeat_recording:
                    rt, qa = recording_time_list[recording_live]
                    have_record_time = now_time - rt
                    print(f"{recording_live}[{qa}] \u6b63\u5728\u5f55\u5236\u4e2d {str(have_record_time).split('.')[0]}")
                print("x" * 60)
                start_display_time = now_time
        except Exception as e:
            logger.error(f"\u9519\u8bef\u4fe1\u606f: {e} \u53d1\u751f\u9519\u8bef\u7684\u884c\u6570: {e.__traceback__.tb_linenoet(recording))\n                print(f\"\\u6b63\\u5728\\u5f55\\u5236{len(no_repeat_recording)}\\u4e2a\\u76f4\\u64ad: \")\n                for recording_live in no_repeat_recording:\n                    rt, qa = recording_time_list[recording_live]\n                    have_record_time = now_time - rt\n                    print(f\"{recording_live}[{qa}] \\u6b63\\u5728\\u5f55\\u5236\\u4e2d {str(have_record_time).split('.')[0]}\")\n                print(\"x\" * 60)\n                start_display_time = now_time\n        except Exception as e:\n            logger.error(f\"\\u9519\\u8bef\\u4fe1\\u606f: {e} \\u53d1\\u751f\\u9519\\u8bef\\u7684\\u884c\\u6570: {e.__traceback__.tb_lineno}\")"}]