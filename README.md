# 斗罗大陆：武魂模拟器

免费的同人角色扮演游戏。你可以创建魂师、修炼成长、探索地图、参与战斗和工坊制作。

## 下载 Windows 本地版

1. 从 [GitHub Releases](https://github.com/www7346/douluo-simulator/releases/latest) 下载 `Douluo-Setup-1.3.67-x64.exe`。
2. 在 Windows 10 或 11 的 64 位电脑上双击安装，从开始菜单打开「斗罗大陆：武魂模拟器」。
3. 选「新的故事」开始，或在「读取存档」里导入之前导出的完整存档。

安装包自带游戏运行时、规则计算服务和游戏资源，无需安装 Node.js、Python 或浏览器。规则计算和存档都在本机完成，无需连接作者的服务器。存档保存在 `%APPDATA%\DouluoSimulator`，也可以在游戏内导出备份。

AI 续写、对话和设计顾问由玩家在「设置 → 模型与用途」配置自己的 API 和模型。外部模型按所选服务联网并计费。安装包没有捆绑模型或 API 密钥。

安装包未签名，Windows 可能显示 SmartScreen 提示。每次发布的 SHA-256 与安装包一起提供。后续更新也可以从 GitHub Releases 下载。

## 构建 Windows 本地版

在 Windows x64 使用 Node.js 24.15.0，在仓库根目录运行：

```powershell
npm ci
npm ci --prefix desktop
npm run typecheck
npm test
npm run build:desktop
```

安装程序位于 `build/windows/`。源码构建默认使用占位美术和自定义写作配置。已有发行版素材的开发者可以将 `DOULUO_ART_ROOT` 指向自己安装目录的 `resources/game/public`，构建会使用其中匹配的图片。仓库中的原创程序包含客户端、本机计算服务和规则引擎。

## 使用自己的 ChatGPT 套餐

在桌面游戏的“设置 → 模型与用途 → 模型渠道”选择“ChatGPT 套餐授权”，点击 **Continue with ChatGPT**。在系统浏览器确认授权后，回到游戏点击“获取模型列表”，自行选择模型并保存。此渠道使用玩家授权的 ChatGPT 套餐或可用额度。模型列表由当前账号返回。可以在同一设置页切换账号、查看用量或退出。

登录使用系统浏览器、动态客户端注册、PKCE 和 IPv4 回环回调。桌面主进程验证身份并用 Windows 系统凭据加密保存令牌。参见 [OpenAI 接入文档](https://developers.openai.com/siwc/token-sharing-open-source)。

## 许可证

本仓库的原创程序代码以 **GPL-3.0-only** 发布，全文见 [LICENSE](LICENSE)。依赖沿用各自许可证。人物设定、商标和第三方素材权利归相应权利人所有；此源码许可不授予这些内容的权利。
