# -*- encoding: utf-8 -*-
import math
import time

def rc4_encrypt(plaintext: str, key: str) -> str:
    s = list(range(256))
    j = 0
    for i in range(256):
        j = (j + s[i] + ord(key[i % len(key)])) % 256
        s[i], s[j] = s[j], s[i]
    i = j = 0
    result = []
    for char in plaintext:
        i = (i + 1) % 256
        j = (j + s[i]) % 256
        s[i], s[j] = s[j], s[i]
        t = (s[i] + s[j]) % 256
        result.append(chr(s[t] ^ ord(char)))
    return ''.join(result)

def left_rotate(x: int, n: int) -> int:
    n %= 32
    return ((x << n) & 0xFFFFFFFF) | (x >> (32 - n))
