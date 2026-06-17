# 七月播放器账号、宠物、商店数据表设计

## 1. 设计目标

这些表用于支持登录后保存宠物数据、宠物成长、商店购买、每日签到、视频奖励、AI token 消耗和宠物进化。

设计原则：

| 原则 | 说明 |
| --- | --- |
| 简明 | 表数量控制在核心范围内，避免一开始过度复杂。 |
| 可扩展 | 后续可加会员、活动、排行榜、云课程记录。 |
| 可追踪 | 奖励、消费、购买、AI token 消耗都要有流水。 |
| 可恢复 | 用户数据异常时，可以通过流水重建关键资产。 |

## 2. 表总览

| 表名 | 用途 |
| --- | --- |
| `users` | 用户主表。 |
| `user_auth_identities` | 登录身份表，保存邮箱、手机号、第三方账号。 |
| `user_sessions` | 登录设备和 refresh token 管理。 |
| `pet_species` | 宠物种类配置表。 |
| `user_pets` | 用户拥有的宠物实例。 |
| `pet_progress` | 主宠物成长、等级、经验、阶段、数值。 |
| `pet_wallets` | 用户宠物货币账户。 |
| `pet_wallet_transactions` | 代币收入和消费流水。 |
| `shop_items` | 商店商品配置。 |
| `user_inventory` | 用户道具和已解锁宠物库存。 |
| `shop_orders` | 商店购买订单。 |
| `daily_checkins` | 每日签到记录。 |
| `video_reward_claims` | 看完视频奖励记录。 |
| `pet_ai_permissions` | 用户是否允许宠物消耗 AI token。 |
| `pet_ai_token_logs` | 宠物 AI token 消耗和成长记录。 |
| `sync_events` | 客户端同步事件，用于断网重试和排查问题。 |

## 3. 用户表

### 3.1 `users`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | 是 | 用户 ID。 |
| `nickname` | varchar(64) | 是 | 用户昵称。 |
| `avatar_url` | varchar(512) | 否 | 头像地址。 |
| `status` | varchar(32) | 是 | `active` / `banned` / `deleted`。 |
| `created_at` | datetime | 是 | 创建时间。 |
| `updated_at` | datetime | 是 | 更新时间。 |

建议索引：

| 索引 | 字段 |
| --- | --- |
| `idx_users_status` | `status` |

### 3.2 `user_auth_identities`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | 是 | 身份 ID。 |
| `user_id` | uuid | 是 | 关联 `users.id`。 |
| `provider` | varchar(32) | 是 | `email` / `phone` / `github` / `google`。 |
| `identifier` | varchar(128) | 是 | 邮箱、手机号或第三方 openid。 |
| `verified_at` | datetime | 否 | 验证时间。 |
| `created_at` | datetime | 是 | 创建时间。 |

唯一约束：

| 约束 | 字段 |
| --- | --- |
| `uk_auth_provider_identifier` | `provider`, `identifier` |

### 3.3 `user_sessions`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | 是 | 会话 ID。 |
| `user_id` | uuid | 是 | 用户 ID。 |
| `device_id` | varchar(128) | 是 | 客户端设备 ID。 |
| `device_name` | varchar(128) | 否 | 设备名称，例如 Windows Desktop。 |
| `refresh_token_hash` | varchar(255) | 是 | refresh token 哈希，不能存明文。 |
| `expires_at` | datetime | 是 | refresh token 过期时间。 |
| `revoked_at` | datetime | 否 | 主动退出或风控撤销时间。 |
| `last_seen_at` | datetime | 是 | 最近活跃时间。 |
| `created_at` | datetime | 是 | 创建时间。 |

## 4. 宠物配置和实例

### 4.1 `pet_species`

宠物种类配置表，后端可通过它控制哪些宠物可解锁。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | varchar(64) | 是 | 宠物种类 ID，例如 `classic_cat`。 |
| `name` | varchar(64) | 是 | 宠物名称。 |
| `description` | text | 否 | 宠物说明。 |
| `rarity` | varchar(32) | 是 | `common` / `rare` / `epic` / `legendary`。 |
| `unlock_level` | int | 是 | 解锁需要的用户宠物等级。 |
| `price_coins` | int | 是 | 商店购买价格，免费填 0。 |
| `asset_url` | varchar(512) | 否 | 宠物资源地址。 |
| `is_active` | boolean | 是 | 是否上架。 |
| `created_at` | datetime | 是 | 创建时间。 |
| `updated_at` | datetime | 是 | 更新时间。 |

### 4.2 `user_pets`

用户拥有的宠物实例。每个宠物都有自己的等级和名字。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | 是 | 用户宠物实例 ID。 |
| `user_id` | uuid | 是 | 用户 ID。 |
| `species_id` | varchar(64) | 是 | 关联 `pet_species.id`。 |
| `custom_name` | varchar(64) | 否 | 用户自定义宠物名。 |
| `rename_used` | boolean | 是 | 是否已经使用过首次免费改名机会。 |
| `level` | int | 是 | 宠物等级，建议 1 到 7。 |
| `xp` | int | 是 | 当前等级内经验。 |
| `stage` | varchar(32) | 是 | 阶段，例如 `starter` / `explorer` / `advanced` / `master`。 |
| `is_main` | boolean | 是 | 是否主宠物。 |
| `unlocked_at` | datetime | 是 | 解锁时间。 |
| `created_at` | datetime | 是 | 创建时间。 |
| `updated_at` | datetime | 是 | 更新时间。 |

建议约束：

| 约束 | 字段 |
| --- | --- |
| `uk_user_species` | `user_id`, `species_id` |

## 5. 主宠物成长状态

### 5.1 `pet_progress`

保存主宠物当前状态，用于快速读取。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `user_id` | uuid | 是 | 用户 ID，主键。 |
| `main_pet_id` | uuid | 是 | 当前主宠物。 |
| `total_xp` | int | 是 | 总经验。 |
| `level` | int | 是 | 账号宠物系统总等级，建议 1 到 7。 |
| `evolution_stage` | varchar(32) | 是 | 当前进化阶段。 |
| `hunger` | int | 是 | 饥饿值，0 到 100。 |
| `energy` | int | 是 | 能量值，0 到 100。 |
| `mood` | int | 是 | 心情值，0 到 100。 |
| `affection` | int | 是 | 亲密度，0 到 100。 |
| `last_interaction_at` | datetime | 否 | 最近互动时间。 |
| `updated_at` | datetime | 是 | 更新时间。 |

等级建议：

| 等级 | 名称 | 总经验门槛 | 解锁 |
| --- | --- | --- | --- |
| 1 | 入门者 | 0 | 基础宠物、喂养、抚摸。 |
| 2 | 观察者 | 300 | 每日签到加成。 |
| 3 | 探索者 | 900 | 宠物商店普通商品。 |
| 4 | 进阶者 | 1800 | 看视频奖励、更多动作。 |
| 5 | 专注伙伴 | 3200 | AI 成长授权、稀有宠物。 |
| 6 | 大师 | 5200 | 高级装饰、桌面宠物增强。 |
| 7 | 传奇伙伴 | 8000 | 传奇宠物和专属徽章。 |

## 6. 货币和流水

### 6.1 `pet_wallets`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `user_id` | uuid | 是 | 用户 ID，主键。 |
| `coins` | int | 是 | 普通代币。 |
| `gems` | int | 是 | 高级货币，后续可选。 |
| `updated_at` | datetime | 是 | 更新时间。 |

### 6.2 `pet_wallet_transactions`

所有代币收入和消费都写流水。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | 是 | 流水 ID。 |
| `user_id` | uuid | 是 | 用户 ID。 |
| `currency` | varchar(16) | 是 | `coins` / `gems`。 |
| `amount` | int | 是 | 正数收入，负数支出。 |
| `reason` | varchar(64) | 是 | `daily_checkin` / `video_reward` / `shop_purchase` / `ai_growth`。 |
| `ref_id` | varchar(128) | 否 | 关联订单、签到、奖励或 AI 日志。 |
| `balance_after` | int | 是 | 变更后余额。 |
| `created_at` | datetime | 是 | 创建时间。 |

## 7. 商店和库存

### 7.1 `shop_items`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | varchar(64) | 是 | 商品 ID。 |
| `type` | varchar(32) | 是 | `pet` / `food` / `toy` / `skin` / `badge`。 |
| `name` | varchar(64) | 是 | 商品名称。 |
| `description` | text | 否 | 商品说明。 |
| `price_coins` | int | 是 | 代币价格。 |
| `price_gems` | int | 是 | 高级货币价格。 |
| `unlock_level` | int | 是 | 解锁等级。 |
| `stock_limit` | int | 否 | 限购数量，空表示不限购。 |
| `payload_json` | json | 否 | 商品效果配置。 |
| `is_active` | boolean | 是 | 是否上架。 |
| `created_at` | datetime | 是 | 创建时间。 |
| `updated_at` | datetime | 是 | 更新时间。 |

### 7.2 `user_inventory`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | 是 | 库存 ID。 |
| `user_id` | uuid | 是 | 用户 ID。 |
| `item_id` | varchar(64) | 是 | 商品 ID。 |
| `quantity` | int | 是 | 数量。 |
| `source` | varchar(64) | 是 | `shop` / `checkin` / `video_reward` / `system`。 |
| `created_at` | datetime | 是 | 创建时间。 |
| `updated_at` | datetime | 是 | 更新时间。 |

### 7.3 `shop_orders`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | 是 | 订单 ID。 |
| `user_id` | uuid | 是 | 用户 ID。 |
| `item_id` | varchar(64) | 是 | 商品 ID。 |
| `quantity` | int | 是 | 购买数量。 |
| `currency` | varchar(16) | 是 | `coins` / `gems`。 |
| `total_price` | int | 是 | 总价格。 |
| `status` | varchar(32) | 是 | `paid` / `cancelled` / `refunded`。 |
| `created_at` | datetime | 是 | 创建时间。 |

## 8. 签到和视频奖励

### 8.1 `daily_checkins`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | 是 | 签到 ID。 |
| `user_id` | uuid | 是 | 用户 ID。 |
| `checkin_date` | date | 是 | 签到日期。 |
| `streak_days` | int | 是 | 连续签到天数。 |
| `coins_awarded` | int | 是 | 奖励代币。 |
| `xp_awarded` | int | 是 | 奖励经验。 |
| `created_at` | datetime | 是 | 创建时间。 |

唯一约束：

| 约束 | 字段 |
| --- | --- |
| `uk_user_checkin_date` | `user_id`, `checkin_date` |

### 8.2 `video_reward_claims`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | 是 | 领取 ID。 |
| `user_id` | uuid | 是 | 用户 ID。 |
| `video_id` | varchar(128) | 否 | 视频或广告 ID。 |
| `reward_type` | varchar(32) | 是 | `coins` / `xp` / `item`。 |
| `coins_awarded` | int | 是 | 奖励代币。 |
| `xp_awarded` | int | 是 | 奖励经验。 |
| `item_id` | varchar(64) | 否 | 奖励道具。 |
| `watch_seconds` | int | 是 | 实际观看时长。 |
| `claimed_at` | datetime | 是 | 领取时间。 |

建议限制：

| 限制 | 说明 |
| --- | --- |
| 每日次数 | 每个用户每天最多领取固定次数，例如 5 次。 |
| 最短观看 | 观看达到阈值才允许领取，例如 20 秒。 |
| 防重复 | 同一个 `video_id` 短时间内不能重复刷奖励。 |

## 9. AI token 授权和消耗

### 9.1 `pet_ai_permissions`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `user_id` | uuid | 是 | 用户 ID，主键。 |
| `enabled` | boolean | 是 | 是否允许宠物消耗 AI token。 |
| `daily_token_budget` | int | 是 | 每日最多消耗 token。 |
| `used_tokens_today` | int | 是 | 今日已用 token。 |
| `reset_date` | date | 是 | 今日额度日期。 |
| `updated_at` | datetime | 是 | 更新时间。 |

### 9.2 `pet_ai_token_logs`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | 是 | 日志 ID。 |
| `user_id` | uuid | 是 | 用户 ID。 |
| `pet_id` | uuid | 是 | 宠物 ID。 |
| `action` | varchar(64) | 是 | `self_growth` / `chat` / `evolution_hint`。 |
| `model` | varchar(128) | 否 | 使用的模型。 |
| `prompt_tokens` | int | 是 | 输入 token。 |
| `completion_tokens` | int | 是 | 输出 token。 |
| `total_tokens` | int | 是 | 总 token。 |
| `xp_awarded` | int | 是 | 本次 AI 行为奖励经验。 |
| `summary` | text | 否 | AI 结果摘要，不存敏感 prompt。 |
| `created_at` | datetime | 是 | 创建时间。 |

## 10. 同步事件

### 10.1 `sync_events`

客户端断网时可以先本地记录，联网后批量同步到后端。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | uuid | 是 | 同步事件 ID。 |
| `user_id` | uuid | 是 | 用户 ID。 |
| `device_id` | varchar(128) | 是 | 设备 ID。 |
| `event_type` | varchar(64) | 是 | `pet_update` / `shop_purchase` / `checkin` / `reward_claim`。 |
| `payload_json` | json | 是 | 事件内容。 |
| `client_created_at` | datetime | 是 | 客户端产生时间。 |
| `server_received_at` | datetime | 是 | 服务端接收时间。 |
| `status` | varchar(32) | 是 | `accepted` / `ignored` / `conflict`。 |

## 11. 核心业务规则

| 规则 | 说明 |
| --- | --- |
| 首次命名 | 用户第一次拥有主宠物时，可以免费自定义名称一次。 |
| 宠物等级 | 每只宠物有自己的 `level` 和 `xp`。 |
| 总等级 | `pet_progress.level` 表示账号级宠物系统等级，用于解锁商店和宠物。 |
| 代币来源 | 每日签到、看完视频、完成任务、AI 成长都可以产出代币或 XP。 |
| 代币消费 | 商店购买、特殊互动、宠物进化材料可以消耗代币。 |
| AI token | 只有 `pet_ai_permissions.enabled = true` 时，宠物才能消耗用户 AI token。 |
| 防刷 | 签到、视频奖励、AI 成长都需要每日上限。 |
| 冲突处理 | 多设备同时修改时，以服务端版本号或事件时间做合并。 |

## 12. 最小上线表

第一阶段如果想快速上线，建议先做下面 8 张表：

| 表名 | 原因 |
| --- | --- |
| `users` | 登录主数据。 |
| `user_auth_identities` | 邮箱/手机号登录。 |
| `user_sessions` | token 和设备管理。 |
| `pet_species` | 宠物配置。 |
| `user_pets` | 用户拥有的宠物。 |
| `pet_progress` | 主宠物成长状态。 |
| `pet_wallets` | 代币余额。 |
| `pet_wallet_transactions` | 奖励和消费流水。 |

第二阶段再加：

| 表名 | 原因 |
| --- | --- |
| `shop_items` | 商店商品。 |
| `user_inventory` | 用户库存。 |
| `shop_orders` | 商店订单。 |
| `daily_checkins` | 每日签到。 |
| `video_reward_claims` | 看视频奖励。 |
| `pet_ai_permissions` | AI token 授权。 |
| `pet_ai_token_logs` | AI token 消耗记录。 |
| `sync_events` | 离线同步和排查。 |
