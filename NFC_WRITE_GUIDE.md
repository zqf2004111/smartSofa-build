# NFC 卡写入指南

> 写一次卡 → 后续贴卡直接拉起 App，不联网、不弹浏览器

## 工作原理

每张 NFC 卡写 **2 条 NDEF 记录**：

| # | 类型 | 内容 | 作用 |
|---|---|---|---|
| 1 | **URI** | `https://zqf2004111.github.io/pair?name=KD_SOF` | 装了 App 时提取设备名启动配对；未装时浏览器跳下载页 |
| 2 | **AAR** (Android Application Record) | `com.smarthome.control` | 已装 App 时**直接拉起**，绕过浏览器/选择器 |

> Android 看到 AAR 就跳过 App 选择器，直接把整个 NDEF 消息派发给 `com.smarthome.control` 的 NDEF 处理器。

**参数说明**：
- `name` — BLE 广播名（必填，必须以 `KD_` 开头）。App 收到后扫描 BLE，匹配到同名设备自动连接
- 型号差异由 BLE 广播协议自适应，**不需要在 NFC 里区分型号**
- 不同沙发 → 不同 `name`（如 `KD_SOF_A` / `KD_SOF_B`）；AAR 永远是 `com.smarthome.control`

---

## TagWriter 写卡步骤（推荐）

### 准备
1. 装 NXP **TagWriter**（应用商店搜）
2. 空白 NTAG213/215 卡
3. 手机开 NFC

### 开多记录模式（一次性设置）

主屏 ☰ 菜单 → **Settings** → 打开 "**Expert mode**"（或 "Multiple records"）

### 写入

1. 主屏 → "**Write tags**" → "**New data set**"

2. **第 1 条 — URL**
   - 选 "**Link**"
   - URI Type 选 `https://`
   - URL：`https://zqf2004111.github.io/pair?name=KD_SOF`
   - 保存

3. **第 2 条 — AAR**
   - 点 "**+ Add another record**"
   - 选 "**Application**" / "**Android Application Record**"
   - Package name：`com.smarthome.control`
   - 保存

4. 列表显示 2 条记录 → 点 "**Save & Write**" → 空白卡贴手机背面 → 等成功

---

## NFC Tools 写卡步骤（备选）

1. 打开 NFC Tools → "**写入 / Write**"
2. "**添加记录**" → "**URL/URI**"，输入 `https://zqf2004111.github.io/pair?name=KD_SOF`
3. "**添加记录**" → "**应用程序 / Application / AAR**"，输入 `com.smarthome.control`
4. 列表 2 条 → "**写入 / Write**" → 贴卡

---

## 验证

1. **读卡确认**：用同一 App "**读取 / Read**" 模式贴卡 → 应看到 2 条记录
2. **拉起测试**：锁屏 / 强制关 App → 贴卡：
   - 直接打开本 App ✓
   - 自动弹"添加设备"对话框 ✓
   - 自动找到 `KD_SOF` 并连接 ✓
3. **logcat 验证**：
   ```bash
   adb logcat | grep "pair target from URL"
   ```
   应输出：`[NFC] pair target from URL: KD_SOF {}`

---

## 常见问题

**Q: 贴卡弹出浏览器/网页？**
A: AAR 没写入或包名错。读卡确认有一条 "Application Record" 且包名是 `com.smarthome.control`。

**Q: App 启动了但没自动连接？**
A: 检查 URI 里 `?name=` 拼写，必须以 `KD_` 开头。

**Q: 没装 App 时贴卡？**
A: 系统找不到 `com.smarthome.control`，回落到 URI → 浏览器打开 `/pair` 下载页。

**Q: iOS 贴卡？**
A: iOS 忽略 AAR（安卓专属），用 URI 跳 Safari 到 `/pair` 下载页。iOS 直接拉起 App 需后续实现 Universal Links + AASA，目前未启用。

**Q: 卡只能写一次吗？**
A: NTAG213/215/216 默认可重复写。如不能写，可能是只读锁定卡。

---

## 调试命令

```bash
# 看 NDEF intent-filter 是否生效
adb shell dumpsys package com.smarthome.control | grep -A3 NDEF_DISCOVERED

# 实时监听 NFC 事件
adb logcat -s SmartSofaNFC:I '*:S'

# 模拟 NDEF intent（不是真实卡，但可验证 manifest 路由）
adb shell am start -W -a android.nfc.action.NDEF_DISCOVERED \
  -d 'https://zqf2004111.github.io/pair?name=KD_SOF' \
  com.smarthome.control/.MainActivity

# 监控前端日志
adb logcat -s Capacitor/Console:I '*:S' | grep "pair target"
```

---

## 进阶：扩展字段（可选，目前用不到）

代码已支持 NFC 卡携带任意额外参数（External Type record 或 URL query 都可），App 端会自动透传。
若未来需要（如售后扫卡查保修、按型号下发不同动画等），可在 URL 里直接加字段：

```
https://zqf2004111.github.io/pair?name=KD_SOF&serial=SF20260613A001&fw=1.2.3
```

`MainActivity.extractUriFromNdef()` 已支持的高级写法（External Type record 携带 JSON）见代码注释。
