# 斗罗大陆：武魂模拟器

免费同人角色扮演游戏的源码。包含角色成长、战斗、地图、队伍、工坊、剧情、存档、模型连接和 Windows 桌面客户端。网页试玩见 [douluo.it.com](https://douluo.it.com/)。

## 构建 Windows 本地版

在 Windows x64 使用 Node.js 24.15.0，在仓库根目录运行：

```powershell
npm ci
npm ci --prefix desktop
npm run typecheck
npm test
npm run build:desktop
```

安装程序位于 `build/windows/Douluo-Setup-1.3.41-x64.exe`。计算服务、网页和 Node 运行时都随安装程序打包。源码版自带占位美术和自定义写作配置。开发者如已取得发行版图片，可将环境变量 `DOULUO_ART_ROOT` 指向自己安装目录的 `resources/game/public`，构建会使用其中匹配的图片。第三方写作预设文本、音乐、插画原件、私有运维配置和玩家存档不在这个仓库内。

## 使用自己的 ChatGPT 套餐

在桌面游戏的“设置 → 模型与用途 → 模型渠道”选择“ChatGPT 套餐授权”，点击 **Continue with ChatGPT**。在系统浏览器确认授权后，回到游戏点击“获取模型列表”，自行选择模型并保存。此渠道使用玩家授权的 ChatGPT 套餐或可用额度。模型列表由当前账号返回。可以在同一设置页切换账号、查看用量或退出。

登录使用系统浏览器、动态客户端注册、PKCE 和 IPv4 回环回调。桌面主进程验证身份并用 Windows 系统凭据加密保存令牌。网页试玩使用自己的模型渠道。参见 [OpenAI 官方接入文档](https://developers.openai.com/siwc/token-sharing-open-source)。

## 许可证

本仓库的原创程序代码以 **GPL-3.0-only** 发布，全文见 [LICENSE](LICENSE)。依赖沿用各自许可证。人物设定、商标和第三方素材权利归相应权利人所有；此源码许可不授予这些内容的权利。
