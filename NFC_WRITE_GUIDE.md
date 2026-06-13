# NFC 卡写入指南（NFC Tools）

> 写一次卡 → 后续贴卡直接拉起 App，不联网、不弹浏览器

## 工作原理

完整 NDEF 消息建议写入 **三条记录**（最少两条）：

| # | 类型 | 内容 | 作用 | 必需 |
|---|---|---|---|---|
| 1 | **AAR** (Android Application Record) | `com.smarthome.control` | **直接拉起 App**，绕过浏览器/选择器 | ✅ |
| 2 | **External Type** (`vnd.smartsofa.com:pair`) | JSON：`{"name":"KD_SOF","serial":"...","model":"..."}` | 携带结构化设备信息（推荐主载体） | ⭕ 可选 |
| 3 | **URI** | `https://zqf2004111.github.io/pair?name=KD_SOF` | 未装 App 时跳下载页 | ✅ |

**App 解析优先级**：External Type → URI → intent.getData()。装了 App 时 External 优先（数据可结构化扩展），没装时 URI 兜底（浏览器打开下载页）。

> Android 看到 AAR 就会跳过 App 选择器，直接把整个 NDEF 消息派发给 `com.smarthome.control` 的 `NDEF_DISCOVERED` 处理器。

## 写卡步骤（NFC Tools）

### 准备
1. 安卓手机装 [NFC Tools (NXP)](https://play.google.com/store/apps/details?id=com.wakdev.wdnfc)（国内应用商店搜 "NFC Tools"）
2. 空白可写 NTAG213/215/216（NTAG215 容量最稳，3 条记录推荐用 215/216）
3. 手机开 NFC

### 流程

**Step 1: URI 记录（必需）**
1. NFC Tools → "**写入**"（Write）→ "**添加记录**"
2. 选 "**URL/URI**" → `http://...`
3. 输入：`https://zqf2004111.github.io/pair?name=KD_SOF`

**Step 2: External Type 记录（推荐，带结构化数据）**
1. "**添加记录**" → "**自定义记录**" / "**Custom record**" / "**External Type**"
2. **Type** 字段填：`vnd.smartsofa.com:pair`
3. **Payload** 字段填（UTF-8 JSON，单行）：
   ```json
   {"name":"KD_SOF","serial":"SF20260613A001","model":"SF1"}
   ```
   - `name` 必填（BLE 设备名，匹配前缀 `KD_`）
   - `serial`、`model` 可选；以后想加字段直接加，App 端会自动透传

**Step 3: AAR 记录（关键，决定是否绕开浏览器）**
1. "**添加记录**" → "**应用程序**" / "**Application**" / "**Android Application Record**"
2. 输入包名：`com.smarthome.control`

**Step 4: 写入**
1. 列表应显示三条记录：URL + 自定义 + Application
2. 点 "**写入 / Write**"
3. 空白卡贴手机背面 NFC 区
4. 等"写入成功"

### 简化版（只两条）
没找到 External Type 入口的话，写 **URI + AAR** 两条就够（旧版指南），所有信息都塞 URL query 里：
`https://zqf2004111.github.io/pair?name=KD_SOF&serial=SF20260613A001&model=SF1`

### 验证

1. **读卡确认**：NFC Tools "**读取**" 模式贴卡 → 应看到 2~3 条记录
2. **拉起测试**：锁屏 / 强制关 App，贴卡：
   - 直接打开 App ✓
   - 自动弹 "添加设备" 对话框 ✓
   - 自动找到 `KD_SOF` 并连接 ✓
3. **logcat 验证 extras 透传**：
   ```bash
   adb logcat | grep "pair target from URL"
   ```
   应输出：`[NFC] pair target from URL: KD_SOF {"serial":"SF20260613A001","model":"SF1"}`

## 多设备写卡

每张卡写不同的 `name`（KD_SOF_A / KD_SOF_B …）和 `serial`，AAR 与 External `Type` 始终一致。可在 NFC Tools 中保存"任务模板"批量写。

## 常见问题

**Q: 贴卡弹浏览器？**
A: AAR 没写入或包名错。Read 卡确认有一条 "Application Record" 且包名等于 `com.smarthome.control`。

**Q: 启动了但没自动连接？**
A: 找不到 `name` 字段。检查 URI 的 `?name=` 或 External JSON 的 `"name"`，必须以 `KD_` 开头。

**Q: External record 写不进去 / NFC Tools 没这个选项？**
A: 用 "Custom record" / "Mime / Type" 入口，TNF 选 **External Type (0x04)**。或退一步，改用纯 URI 方案（把所有参数放 query string）。

**Q: 没装 App 时？**
A: AAR 找不到匹配 App，系统降级到 URI 记录 → 浏览器打开 `/pair` 下载页。

**Q: iOS 贴卡？**
A: iOS 只读第一条非 AAR 记录（通常是 URI），打开 Safari 跳 `/pair` 下载页。iOS 直接拉起 App 需后续实现 Universal Links + AASA。

**Q: 卡的容量不够？**
A: NTAG213 ~132 字节，写 3 条短记录足够。如 JSON 较长（如多字段），用 NTAG215（504 字节）或 NTAG216（872 字节）。

## App 端解析逻辑（参考）

`MainActivity.java::extractUriFromNdef()`：
1. **第一遍**遍历所有 record，找 TNF=External + type=`vnd.smartsofa.com:pair` → 解析 JSON payload → 合成 `smartsofa://pair?name=...&serial=...&model=...`
2. **第二遍**找首个 URI record → `intent.getData()`
3. fallback：原始 intent 的 data

合成的 Uri 走 ACTION_VIEW 重派发，由 `@capacitor/app` 的 `appUrlOpen` 监听，前端 `src/context.tsx` 的 `parseUrl()` 解析所有 query 参数。

## 调试命令

```bash
# 看 NDEF intent-filter 是否生效
adb shell dumpsys package com.smarthome.control | grep -A3 NDEF_DISCOVERED

# 实时监听 NFC 事件
adb logcat -s SmartSofaNFC:I NfcDispatcher:I '*:S'

# 模拟 URI-only NDEF intent（External record 无法用 ADB 模拟，需真实卡）
adb shell am start -W -a android.nfc.action.NDEF_DISCOVERED \
  -d 'smartsofa://pair?name=KD_SOF&serial=ABC123' \
  com.smarthome.control/.MainActivity

# 监控前端日志
adb logcat -s Capacitor/Console:I '*:S' | grep "pair target"
```
