import { createHash } from "node:crypto";
import { container } from "@yuudachi/framework";
import type { Snowflake } from "discord.js";
import type { Redis } from "ioredis";
import { kRedis } from "../../tokens.js";
import { SPAM_EXPIRE_SECONDS } from "../../util/constants.js";

export function createContentHash(content: string) {
	return createHash("md5").update(content.toLowerCase()).digest("hex");
}

export async function totalContents(guildId: Snowflake, userId: Snowflake, content: string) {
	const redis = container.resolve<Redis>(kRedis);

	const contentHash = createContentHash(content);

	const channelSpamKey = `guild:${guildId}:user:${userId}:contenthash:${contentHash}`;
	const total = await redis.incr(channelSpamKey);
	await redis.expire(channelSpamKey, SPAM_EXPIRE_SECONDS);

	return total;
}
