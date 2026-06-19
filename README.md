# 抖音直播录制工具(整合版)

基于 [ihmily/DouyinLiveRecorder](https://github.com/ihmily/DouyinLiveRecorder) 二次开发的 Electron 桌面整合版。

## 项目说明

本项目的录制核心完全基于开源项目 [DouyinLiveRecorder](https://github.com/ihmily/DouyinLiveRecorder) （原作者：ihmily），感谢原作者的杰出贡献。

**主要特点：**
- 🖥️ 使用 Electron 框架构建现代化桌面界面
- 📹 集成原项目录制核心，支持多平台直播录制
- 🎯 系统托盘运行，支持开机自启、自动监控
- 📊 实时日志显示，直观的监控面板
- ⚙️ 完整的设置管理，一键恢复默认
- 🚀 可打包为独立安装程序

## 目录结构

```
├── main.js              # Electron 主进程
├── backend.js           # Express 后端 API
├── index.html           # 前端界面
├── preload.js           # 安全上下文桥接
├── package.json         # 项目配置
├── DouyinLiveRecorder/  # 录制核心
│   ├── main.py          # Python 入口
│   ├── src/             # Python 模块
│   ├── config/          # 配置文件
│   ├── javascript/      # JS 脚本
│   └── _internal/       # Python 运行时（需从原项目获取）
```

## 开发运行

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 打包构建
npm run build
```

## 注意事项

- `DouyinLiveRecorder/_internal/` 和 `DouyinLiveRecorder.exe` 请从[原项目 Release](https://github.com/ihmily/DouyinLiveRecorder/releases) 下载后放入对应目录
- 需要 Node.js 环境
- 使用前请配置抖音 Cookie

## 许可证

本项目遵循 MIT 许可证。录制核心部分版权归 [ihmily/DouyinLiveRecorder](https://github.com/ihmily/DouyinLiveRecorder) 所有。
