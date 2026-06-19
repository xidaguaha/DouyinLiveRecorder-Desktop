import os, sys
from enum import Enum, auto
from dataclasses import dataclass, field
class ProxyType(Enum): HTTP = auto(); HTTPS = auto(); SOCKS = auto()
@dataclass(frozen=True)
class ProxyInfo:
    ip: str = field(default='', repr=True)
    port: str = field(default='', repr=True)
    def __post_init__(self):
        if (self.ip and not self.port) or (not self.ip and self.port): raise ValueError('Invalid proxy')
class ProxyDetector:
    def __init__(self):
        if sys.platform.startswith('win'):
            import winreg
            self.winreg = winreg
            self.__path = r'Software\Microsoft\Windows\CurrentVersion\Internet Settings'
            self.__INTERNET_SETTINGS = winreg.OpenKeyEx(winreg.ConnectRegistry(None, winreg.HKEY_CURRENT_USER), self.__path, 0, winreg.KEY_ALL_ACCESS)
    def is_proxy_enabled(self):
        if sys.platform.startswith('win'):
            try: return self.winreg.QueryValueEx(self.__INTERNET_SETTINGS, 'ProxyEnable')[0] == 1
            except: return False
        return False
    def get_proxy_info(self):
        if sys.platform.startswith('win'):
            try:
                if self.is_proxy_enabled():
                    return ProxyInfo(*self.winreg.QueryValueEx(self.__INTERNET_SETTINGS, 'ProxyServer')[0].split(':'))
            except: pass
        return ProxyInfo('', '')
