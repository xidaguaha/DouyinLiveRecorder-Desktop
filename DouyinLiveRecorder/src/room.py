# -*- encoding: utf-8 -*-
import re, urllib.parse, execjs, httpx, urllib.request
from . import JS_SCRIPT_PATH, utils
class UnsupportedUrlError(Exception): pass
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 11; SM-G973U) AppleWebKit/537.36 Chrome/87.0.4280.141 Mobile Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.8',
    'Cookie': 's_v_web_id=verify_lk07kv74_QZYCUApD_xhiB_405x_Ax51_GYO9bUIyZQVf'
}
async def get_xbogus(url, headers=None):
    if not headers: headers = HEADERS
    return execjs.compile(open(f'{JS_SCRIPT_PATH}/x-bogus.js').read()).call('sign', urllib.parse.urlparse(url).query, headers.get('User-Agent'))
async def get_sec_user_id(url, proxy_addr=None, headers=None):
    if not headers: headers = HEADERS
    proxy_addr = utils.handle_proxy_addr(proxy_addr)
    async with httpx.AsyncClient(proxy=proxy_addr, timeout=15) as client:
        response = await client.get(url, headers=headers, follow_redirects=True)
        if 'reflow/' in str(response.url):
            match = re.search(r'sec_user_id=([\w_\-]+)&', str(response.url))
            if match: return str(response.url).split('?')[0].rsplit('/', maxsplit=1)[1], match.group(1)
        raise UnsupportedUrlError('URL not supported')
