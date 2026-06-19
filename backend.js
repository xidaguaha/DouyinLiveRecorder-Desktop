const express = require('express');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const iconv = require('iconv-lite');

const app = express();
const PORT = 3847;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 状态管理
let isRecording = false;
let recordingProcess = null;
let logData = [];
let clients = [];

// 查找录制器路径
function findRecorderPath() {
  const packagedPath = path.join(process.resourcesPath, 'DouyinLiveRecorder', 'DouyinLiveRecorder.exe');
  if (fs.existsSync(packagedPath)) {
    console.log('使用 resources 录制器路径:', packagedPath);
    return packagedPath;
  }
  const localDirPath = path.join(__dirname, 'DouyinLiveRecorder', 'DouyinLiveRecorder.exe');
  if (fs.existsSync(localDirPath)) {
    console.log('使用同目录录制器路径:', localDirPath);
    return localDirPath;
  }
  return path.join(__dirname, 'DouyinLiveRecorder.exe');
}

function getRecorderDir() {
  const packagedPath = path.join(process.resourcesPath, 'DouyinLiveRecorder');
  if (fs.existsSync(packagedPath)) return packagedPath;
  const localDirPath = path.join(__dirname, 'DouyinLiveRecorder');
  if (fs.existsSync(localDirPath)) return localDirPath;
  return __dirname;
}

const RECORDER_PATH = findRecorderPath();
const RECORDER_DIR = getRecorderDir();
const CONFIG_DIR = path.join(RECORDER_DIR, 'config');
const URL_CONFIG_PATH = path.join(CONFIG_DIR, 'URL_config.ini');
const MAIN_CONFIG_PATH = path.join(CONFIG_DIR, 'config.ini');

function broadcastLog(message) {
  const timestamp = new Date().toLocaleString('zh-CN');
  const logEntry = { timestamp, message };
  logData.push(logEntry);
  if (logData.length > 1000) logData = logData.slice(-1000);
  clients.forEach(client => {
    client.write(`data: ${JSON.stringify(logEntry)}\n\n`);
  });
}

app.get('/api/logs/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  clients.push(res);
  req.on('close', () => { clients = clients.filter(client => client !== res); });
});

app.get('/api/status', (req, res) => {
  res.json({ isMonitoring: isRecording, recorderPath: RECORDER_PATH, configDir: CONFIG_DIR, recorderDir: RECORDER_DIR, logs: logData.slice(-100) });
});

app.get('/api/logs', (req, res) => { res.json(logData); });
app.post('/api/logs/clear', (req, res) => { logData = []; res.json({ success: true }); });

app.get('/api/rooms', (req, res) => {
  try {
    if (fs.existsSync(URL_CONFIG_PATH)) {
      const content = fs.readFileSync(URL_CONFIG_PATH, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      const rooms = lines.map((line, index) => {
        const disabled = line.trim().startsWith('#');
        const qualityMatch = line.match(/^(超清|原画|高清|标清),\s*(.+)/);
        let quality = null;
        let url = line;
        if (qualityMatch) { quality = qualityMatch[1]; url = qualityMatch[2]; }
        const nameMatch = url.match(/主播[:：]\s*(.+?)(?:,|$)/);
        const name = nameMatch ? nameMatch[1].trim() : null;
        url = url.replace(/^#\s*/, '').trim();
        return { id: index, url, quality, name, disabled };
      });
      res.json(rooms);
    } else { res.json([]); }
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/rooms', (req, res) => {
  try {
    const { url, quality, name } = req.body;
    let line = '';
    if (quality) line += `${quality}, `;
    if (name) line += `主播：${name}, `;
    line += url;
    fs.appendFileSync(URL_CONFIG_PATH, '\n' + line, 'utf-8');
    broadcastLog(`已添加直播间: ${url}`);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/rooms/:index', (req, res) => {
  try {
    const index = parseInt(req.params.index);
    if (fs.existsSync(URL_CONFIG_PATH)) {
      const content = fs.readFileSync(URL_CONFIG_PATH, 'utf-8');
      const lines = content.split('\n');
      if (index >= 0 && index < lines.length) {
        const removed = lines.splice(index, 1);
        fs.writeFileSync(URL_CONFIG_PATH, lines.join('\n'), 'utf-8');
        broadcastLog(`已删除直播间: ${removed[0]}`);
        res.json({ success: true });
      } else { res.status(400).json({ error: '无效的索引' }); }
    } else { res.status(404).json({ error: '配置文件不存在' }); }
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.patch('/api/rooms/:index/toggle', (req, res) => {
  try {
    const index = parseInt(req.params.index);
    if (fs.existsSync(URL_CONFIG_PATH)) {
      const content = fs.readFileSync(URL_CONFIG_PATH, 'utf-8');
      const lines = content.split('\n');
      if (index >= 0 && index < lines.length) {
        const line = lines[index];
        if (line.trim().startsWith('#')) {
          lines[index] = line.replace(/^#\s*/, '');
          broadcastLog(`已启用直播间: ${line}`);
        } else {
          lines[index] = '# ' + line;
          broadcastLog(`已禁用直播间: ${line}`);
        }
        fs.writeFileSync(URL_CONFIG_PATH, lines.join('\n'), 'utf-8');
        res.json({ success: true });
      } else { res.status(400).json({ error: '无效的索引' }); }
    } else { res.status(404).json({ error: '配置文件不存在' }); }
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/config', (req, res) => {
  try {
    if (fs.existsSync(MAIN_CONFIG_PATH)) {
      const content = fs.readFileSync(MAIN_CONFIG_PATH, 'utf-8');
      res.json({ content, path: MAIN_CONFIG_PATH });
    } else { res.json({ content: '', path: MAIN_CONFIG_PATH }); }
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/config', (req, res) => {
  try {
    const { content } = req.body;
    fs.writeFileSync(MAIN_CONFIG_PATH, content, 'utf-8');
    broadcastLog('配置已保存');
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/settings/autoStart', (req, res) => {
  const { enabled } = req.body;
  const appPath = process.execPath;
  const regKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
  if (enabled) {
    exec(`reg add "${regKey}" /v "抖音直播录制工具" /t REG_SZ /d "\\"${appPath}\\" --startup" /f`, (err) => {
      if (err) { console.error('设置开机自启失败:', err); return res.status(500).json({ error: '设置失败' }); }
      broadcastLog('已设置开机自启');
      res.json({ success: true });
    });
  } else {
    exec(`reg delete "${regKey}" /v "抖音直播录制工具" /f`, (err) => {
      if (err) { console.error('取消开机自启失败:', err); return res.status(500).json({ error: '取消失败' }); }
      broadcastLog('已取消开机自启');
      res.json({ success: true });
    });
  }
});

app.post('/api/settings/autoMonitor', (req, res) => {
  const { enabled } = req.body;
  const settingsPath = path.join(CONFIG_DIR, 'auto_monitor.txt');
  try {
    fs.writeFileSync(settingsPath, enabled ? '1' : '0');
    broadcastLog(enabled ? '已设置启动时自动监控' : '已取消启动时自动监控');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: '设置失败' }); }
});

app.get('/api/settings/autoMonitor', (req, res) => {
  const settingsPath = path.join(CONFIG_DIR, 'auto_monitor.txt');
  try {
    const content = fs.readFileSync(settingsPath, 'utf8');
    res.json({ enabled: content.trim() === '1' });
  } catch (err) { res.json({ enabled: false }); }
});

app.post('/api/settings/minimizeToTray', (req, res) => {
  const { enabled } = req.body;
  const settingsPath = path.join(CONFIG_DIR, 'minimize_to_tray.txt');
  try {
    fs.writeFileSync(settingsPath, enabled ? '1' : '0');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: '设置失败' }); }
});

app.get('/api/settings/minimizeToTray', (req, res) => {
  const settingsPath = path.join(CONFIG_DIR, 'minimize_to_tray.txt');
  try {
    const content = fs.readFileSync(settingsPath, 'utf8');
    res.json({ enabled: content.trim() === '1' });
  } catch (err) { res.json({ enabled: false }); }
});

function getUserDataDir() {
  let customPath = '';
  try {
    if (fs.existsSync(MAIN_CONFIG_PATH)) {
      const configContent = fs.readFileSync(MAIN_CONFIG_PATH, 'utf8');
      const match = configContent.match(/直播保存路径\(不填则默认\)\s*=\s*(.+)/);
      if (match && match[1] && match[1].trim()) customPath = match[1].trim();
    }
  } catch (e) { console.log('读取配置文件失败:', e.message); }
  if (customPath && customPath.trim()) {
    if (!fs.existsSync(customPath)) { try { fs.mkdirSync(customPath, { recursive: true }); } catch (e) {} }
    if (fs.existsSync(customPath)) return customPath;
  }
  const appDataDir = process.env.APPDATA || '';
  const defaultDir = path.join(appDataDir, 'DouyinLiveRecorder', 'downloads');
  if (!fs.existsSync(defaultDir)) fs.mkdirSync(defaultDir, { recursive: true });
  return defaultDir;
}

app.get('/api/downloads', (req, res) => {
  const downloadsDir = getUserDataDir();
  try {
    if (fs.existsSync(downloadsDir)) {
      const items = fs.readdirSync(downloadsDir, { withFileTypes: true });
      const dirs = items.filter(i => i.isDirectory()).map(i => ({ name: i.name, type: 'dir' }));
      res.json(dirs);
    } else { res.json([]); }
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/downloads/path', (req, res) => {
  res.json({ path: getUserDataDir() });
});

app.post('/api/downloads/open', (req, res) => {
  require('child_process').exec(`start "" "${getUserDataDir()}"`);
  res.json({ success: true });
});

app.post('/api/downloads/openRoom', (req, res) => {
  try {
    const { roomName } = req.body;
    const roomDir = path.join(getUserDataDir(), roomName);
    require('child_process').exec(`start "" "${roomDir}"`);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/monitor/start', (req, res) => {
  if (isRecording) return res.status(400).json({ error: '已经在监控中' });
  if (!fs.existsSync(RECORDER_PATH)) return res.status(404).json({ error: '未找到录制程序: ' + RECORDER_PATH });
  broadcastLog('正在启动监控...');
  broadcastLog('='.repeat(60));
  recordingProcess = spawn(RECORDER_PATH, [], { cwd: RECORDER_DIR, detached: false, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  isRecording = true;
  recordingProcess.stdout.on('data', (data) => {
    try {
      const messageGBK = iconv.decode(data, 'gbk');
      if (messageGBK) { messageGBK.split('\n').forEach(line => { if (line && line.trim()) broadcastLog(line.trim()); }); }
    } catch (e) {
      const messageUTF8 = data.toString('utf8');
      if (messageUTF8) { messageUTF8.split('\n').forEach(line => { if (line && line.trim()) broadcastLog(line.trim()); }); }
    }
  });
  recordingProcess.stderr.on('data', (data) => {
    try {
      const messageGBK = iconv.decode(data, 'gbk');
      if (messageGBK) { messageGBK.split('\n').forEach(line => { if (line && line.trim()) broadcastLog('[STDERR] ' + line.trim()); }); }
    } catch (e) {
      const messageUTF8 = data.toString('utf8');
      if (messageUTF8) { messageUTF8.split('\n').forEach(line => { if (line && line.trim()) broadcastLog('[STDERR] ' + line.trim()); }); }
    }
  });
  recordingProcess.on('close', (code) => { isRecording = false; recordingProcess = null; broadcastLog(`监控已停止，退出码: ${code}`); });
  recordingProcess.on('error', (err) => { isRecording = false; recordingProcess = null; broadcastLog('[错误] 启动监控失败: ' + err.message); });
  res.json({ success: true });
});

app.post('/api/monitor/stop', (req, res) => {
  if (!recordingProcess) return res.status(400).json({ error: '没有正在运行的监控' });
  broadcastLog('正在停止监控...');
  broadcastLog('正在停止所有录制进程...');
  exec('taskkill /f /im ffmpeg.exe', (err) => { if (!err) broadcastLog('已停止所有录制进程'); });
  setTimeout(() => {
    try { recordingProcess.kill('SIGINT'); broadcastLog('正在停止主程序...'); }
    catch (e) { try { exec('taskkill /f /im DouyinLiveRecorder.exe', () => { broadcastLog('已强制停止主程序'); }); } catch (e2) { broadcastLog('[错误] 停止程序失败'); } }
  }, 3000);
  isRecording = false;
  recordingProcess = null;
  broadcastLog('监控已停止');
  res.json({ success: true, isMonitoring: false });
});

app.post('/api/settings/restoreDefaults', (req, res) => {
  try {
    const defaultConfig = `[录制设置]\nlanguage(zh_cn/en) = zh_cn\n是否跳过代理检测(是/否) = 否\n直播保存路径(不填则默认) = \n保存文件夹是否以作者区分 = 是\n保存文件夹是否以时间区分 = 否\n保存文件夹是否以标题区分 = 否\n保存文件名是否包含标题 = 否\n是否去除名称中的表情符号 = 是\n视频保存格式ts|mkv|flv|mp4|mp3音频|m4a音频 = ts\n原画|超清|高清|标清|流畅 = 原画\n是否使用代理ip(是/否) = 否\n代理地址 = \n同一时间访问网络的线程数 = 3\n循环时间(秒) = 300\n分段录制是否开启 = 否\n录制空间剩余阈值(gb) = 1.0\n视频分段时间(秒) = 1800\n录制完成后自动转为mp4格式 = 否\nmp4格式重新编码为h264 = 否\n追加格式后删除原文件 = 是\n生成时间字幕文件 = 否\n是否录制完成后执行自定义脚本 = 否\n使用代理录制的平台(逗号分隔) = tiktok, sooplive, pandalive, winktv, flextv, popkontv, twitch, liveme, showroom, chzzk, shopee, shp, youtu\n直播状态推送渠道 = \n钉钉推送接口链接 = \n微信推送接口链接 = \ntgapi令牌 = \ntg聊天id(个人或者群组id) = \nsmtp邮件服务器 = \nSMTP邮件服务器端口 = 587\n邮箱登录账号 = \n发件人密码(授权码) = \n发件人邮箱 = \n收件人邮箱 = \n开播推送开启(是/否) = 是\n关播推送开启(是/否) = 否\n抖音cookie = \n快手cookie = \nb站cookie = \n虎牙cookie = \n斗鱼cookie = \n`;
    fs.writeFileSync(MAIN_CONFIG_PATH, defaultConfig, 'utf-8');
    const urlConfigPath = path.join(CONFIG_DIR, 'URL_config.ini');
    if (fs.existsSync(urlConfigPath)) fs.writeFileSync(urlConfigPath, '', 'utf-8');
    const autoMonitorPath = path.join(CONFIG_DIR, 'auto_monitor.txt');
    if (fs.existsSync(autoMonitorPath)) fs.unlinkSync(autoMonitorPath);
    const minimizeToTrayPath = path.join(CONFIG_DIR, 'minimize_to_tray.txt');
    if (fs.existsSync(minimizeToTrayPath)) fs.unlinkSync(minimizeToTrayPath);
    broadcastLog('已恢复所有设置到默认值');
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: '恢复失败: ' + err.message }); }
});

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`Backend server running on http://127.0.0.1:${PORT}`);
  broadcastLog(`前端服务已启动 (端口: ${PORT})`);
});

module.exports = { app, server };
