# -*- coding: utf-8 -*-
from typing import Dict, Any
import json, base64, urllib.request, urllib.error, smtplib
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
no_proxy_handler = urllib.request.ProxyHandler({})
opener = urllib.request.build_opener(no_proxy_handler)
headers: Dict[str, str] = {'Content-Type': 'application/json'}
def dingtalk(url: str, content: str, number: str = None, is_atall: bool = False) -> Dict[str, Any]:
    success, error = [], []
    for api in url.replace('\uff0c', ',').split(',') if url.strip() else []:
        json_data = {'msgtype': 'text', 'text': {'content': content}, 'at': {'atMobiles': [number], 'isAtAll': is_atall}}
        try:
            data = json.dumps(json_data).encode('utf-8')
            req = urllib.request.Request(api, data=data, headers=headers)
            response = opener.open(req, timeout=10)
            if json.loads(response.read().decode('utf-8'))['errcode'] == 0: success.append(api)
            else: error.append(api)
        except Exception as e: error.append(api)
    return {'success': success, 'error': error}
def xizhi(url: str, title: str, content: str) -> Dict[str, Any]:
    success, error = [], []
    for api in url.replace('\uff0c', ',').split(',') if url.strip() else []:
        try:
            data = json.dumps({'title': title, 'content': content}).encode('utf-8')
            req = urllib.request.Request(api, data=data, headers=headers)
            response = opener.open(req, timeout=10)
            if json.loads(response.read().decode('utf-8'))['code'] == 200: success.append(api)
            else: error.append(api)
        except: error.append(api)
    return {'success': success, 'error': error}
def send_email(email_host, login_email, email_pass, sender_email, sender_name, to_email, title, content, smtp_port=None, open_ssl=True):
    receivers = to_email.replace('\uff0c', ',').split(',') if to_email.strip() else []
    try:
        message = MIMEMultipart()
        message['From'] = f'=?UTF-8?B?{base64.b64encode(sender_name.encode("utf-8")).decode()}?= <{sender_email}>'
        message['Subject'] = Header(title, 'utf-8')
        t_apart = MIMEText(content, 'plain', 'utf-8')
        message.attach(t_apart)
        smtp_obj = smtplib.SMTP_SSL(email_host, int(smtp_port) or 465) if open_ssl else smtplib.SMTP(email_host, int(smtp_port) or 25)
        smtp_obj.login(login_email, email_pass)
        smtp_obj.sendmail(sender_email, receivers, message.as_string())
        return {'success': receivers, 'error': []}
    except Exception as e: return {'success': [], 'error': receivers}
def tg_bot(chat_id, token, content):
    try:
        data = json.dumps({'chat_id': chat_id, 'text': content}).encode('utf-8')
        req = urllib.request.Request(f'https://api.telegram.org/bot{token}/sendMessage', data=data, headers=headers)
        return {'success': [1], 'error': []}
    except: return {'success': [], 'error': [1]}
def bark(api, title='message', content='test'):
    success, error = [], []
    for _api in api.replace('\uff0c', ',').split(',') if api.strip() else []:
        try:
            data = json.dumps({'title': title, 'body': content}).encode('utf-8')
            req = urllib.request.Request(_api, data=data, headers=headers)
            response = opener.open(req, timeout=10)
            if json.loads(response.read().decode('utf-8'))['code'] == 200: success.append(_api)
            else: error.append(_api)
        except: error.append(_api)
    return {'success': success, 'error': error}
def pushplus(token, title, content):
    success, error = [], []
    for _token in token.replace('\uff0c', ',').split(',') if token.strip() else []:
        try:
            data = json.dumps({'token': _token, 'title': title, 'content': content}).encode('utf-8')
            req = urllib.request.Request('https://www.pushplus.plus/send', data=data, headers=headers)
            response = opener.open(req, timeout=10)
            if json.loads(response.read().decode('utf-8')).get('code') == 200: success.append(_token)
            else: error.append(_token)
        except: error.append(_token)
    return {'success': success, 'error': error}
