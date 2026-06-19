# -*- coding: utf-8 -*-
import json, os, random, shutil, string, hashlib, re, traceback, functools
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse
from collections import OrderedDict
import execjs
from .logger import logger
import configparser
class Color:
    RED = '\033[31m'; GREEN = '\033[32m'; YELLOW = '\033[33m'; BLUE = '\033[34m'; MAGENTA = '\033[35m'; CYAN = '\033[36m'; WHITE = '\033[37m'; RESET = '\033[0m'
def trace_error_decorator(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try: return func(*args, **kwargs)
        except execjs.ProgramError: logger.warning('JS execution failed')
        except Exception as e:
            logger.error(f'{type(e).__name__}: {str(e)} in {func.__name__}')
            return []
    return wrapper
def remove_emojis(text, replace_text=''):
    return re.compile('[\U0001F1E0-\U0001F1FF\U0001F300-\U0001F5FF\U0001F600-\U0001F64F\U0001F680-\U0001F6FF\U00002702-\U000027B0]+', re.UNICODE).sub(replace_text, text)
def handle_proxy_addr(proxy_addr):
    return f'http://{proxy_addr}' if proxy_addr and not proxy_addr.startswith('http') else proxy_addr
def check_md5(file_path):
    with open(file_path, 'rb') as fp: return hashlib.md5(fp.read()).hexdigest()
def get_query_params(url, param_name=None):
    params = parse_qs(urlparse(url).query)
    return params if param_name is None else params.get(param_name, [])
