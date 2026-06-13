# NFC 卡写入指南（NFC Tools）

> 写一次卡 → 后续贴卡直接拉起 App，不联网、不弹浏览器

## 工作原理

每张 NFC 卡需要写入 **两条 NDEF 记录**：

| # | 类型 | 内容 | 作用 |
|---|---|---|---|
| 1 | **AAR** (Android Application Record) | `com.smarthome.control` | **直接拉起 App**（已装），系统强制路由到本 App，不走浏览器 |
| 2 | **URI** | `https://zqf2004111.github.io/pair?name=KD_SOF` | App 内提取设备名；未装 App 时 fallback 到下载页 |

> **关键**：AAR 必须放第一条或与 URI 同消息中。Android 看到 AAR 后会跳过 App 选择器/浏览器，直接派发 `NDEF_DISCOVERED` 给指定包名。

## 写卡步骤（NFC Tools）

### 准备
1. 安卓手机装 [NFC Tools (NXP)](https://play.google.com/store/apps/details?id=com.wakdev.wdnfc)（国内可在应用商店搜"NFC Tools"）
2. 准备空白可写的 NTAG213/215/216 标签（淘宝几毛一张）
3. 手机开 NFC

### 写入流程

**Step 1: 添加 URI 记录**

1. 打开 NFC Tools → "**写入**"（Write）
2. "**添加记录**" → "**URL/URI**"
3. 选择 `http://...`，输入：
   ```
   https://zqf2004111.github.io/pair?name=KD_SOF
   ```
   > 把 `KD_SOF` 换成实际设备的 BLE 名（前缀必须是 `KD_`）

**Step 2: 添加 AAR 记录（关键！）**

1. 同一份记录列表中继续 "**添加记录**"
2. 找 "**应用程序**" / "**Application**" 或 "**Android Application Record**"
3. 输入包名：
   ```
   com.smarthome.control
   ```

**Step 3: 写入卡片**

1. 检查记录列表显示两条：URL + Application
2. 点 "**写入 / Write**"
3. 把空白 NFC 卡贴近手机背面（NFC 天线位置，通常摄像头附近）
4. 等"写入成功"提示

### 验证

1. **同一台手机**先验证：用 NFC Tools "**读取**" 模式贴卡，应能看到两条记录
2. **测试拉起**：锁屏、关 App，贴卡 → 直接打开本 App，自动弹"添加设备"对话框 → 找到 KD_SOF → 自动连接

## 多设备写卡

不同沙发用不同名字（KD_SOF_A / KD_SOF_B / ...），每张卡写入对应名字即可。AAR 始终是同一个 `com.smarthome.control`。

## 常见问题

**Q: 贴卡弹出浏览器/网页？**
A: AAR 记录没写入或顺序错了。AAR 必须与 URI 在同一 NDEF 消息中，重新写卡，确保两条记录都在列表里。

**Q: 贴卡 App 启动了但没自动连接？**
A: URI 中 `?name=KD_SOF` 漏了或拼错。Read 卡确认 URI 内容。

**Q: 卡片只能写一次？**
A: NTAG213/215/216 默认可重复写。如果不能写，可能是只读锁定卡。

**Q: 没装 App 时贴卡怎样？**
A: 系统找不到 `com.smarthome.control`，回落到 URI 记录 → 浏览器打开下载页。

**Q: iOS 贴卡？**
A: iOS 只读 URI 记录（AAR 是安卓专属，iOS 忽略），所以会跳浏览器到 `/pair` 下载页。
iOS 直接拉起 App 需后续实现 Universal Links + AASA 文件，目前未启用。

## 调试命令

```bash
# 看 NDEF intent-filter 是否生效
adb shell dumpsys package com.smarthome.control | grep -A3 NDEF_DISCOVERED

# 实时监听 NFC 事件
adb logcat -s SmartSofaNFC:I NfcDispatcher:I

# 模拟 NDEF intent（不是真实卡，但可验证 manifest 路由）
adb shell am start -W -a android.nfc.action.NDEF_DISCOVERED \
  -d 'https://zqf2004111.github.io/pair?name=KD_SOF' \
  com.smarthome.control/.MainActivity
```
