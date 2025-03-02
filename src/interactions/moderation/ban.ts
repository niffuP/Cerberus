import { ApplicationCommandOptionType } from "discord.js";
import { CASE_REASON_MAX_LENGTH, CASE_REASON_MIN_LENGTH } from "../../util/constants.js";

export const BanCommand = {
	name: "ban",
	description: "Ban a member of(f) this guild",
	options: [
		{
			name: "user",
			description: "The user to action",
			type: ApplicationCommandOptionType.User,
			required: true,
		},
		{
			name: "reason",
			description: "The reason of this action",
			type: ApplicationCommandOptionType.String,
			autocomplete: true,
			min_length: CASE_REASON_MIN_LENGTH,
			max_length: CASE_REASON_MAX_LENGTH,
		},
		{
			name: "days",
			description: "The amount of days to delete messages for",
			type: ApplicationCommandOptionType.Integer,
			choices: [
				{ name: "0 days (default)", value: 0 },
				{ name: "1 day", value: 1 },
				{ name: "2 days", value: 2 },
				{ name: "3 days", value: 3 },
				{ name: "4 days", value: 4 },
				{ name: "5 days", value: 5 },
				{ name: "6 days", value: 6 },
				{ name: "7 days", value: 7 },
			],
		},
		{
			name: "case_reference",
			description: "The reference case",
			type: ApplicationCommandOptionType.Integer,
		},
	],
	default_member_permissions: "0",
} as const;
