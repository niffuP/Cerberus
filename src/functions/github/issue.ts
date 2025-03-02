/* eslint-disable @typescript-eslint/dot-notation */
/* eslint-disable id-length */
/* eslint-disable typescript-sort-keys/string-enum */
import process from "node:process";
import fetch from "node-fetch";
import {
	GITHUB_BASE_URL,
	GITHUB_EMOJI_ISSUE_CLOSED,
	GITHUB_EMOJI_ISSUE_OPEN,
	GITHUB_EMOJI_PR_CLOSED,
	GITHUB_EMOJI_PR_DRAFT,
	GITHUB_EMOJI_PR_MERGED,
	GITHUB_EMOJI_PR_OPEN,
} from "../../util/constants.js";
import { GitHubReviewDecision, isPR } from "./githubInterface.js";
import type { GitHubAPIResult } from "./githubInterface.js";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

enum ResultStatePR {
	OPEN = "OPEN",
	CLOSED = "CLOSED",
	MERGED = "MERGED",
	DRAFT = "DRAFT",
}

enum ResultStateIssue {
	OPEN = "OPEN",
	CLOSED = "CLOSED",
}

const Timestamps = {
	OPEN: "publishedAt",
	CLOSED: "closedAt",
	MERGED: "mergedAt",
	DRAFT: "publishedAt",
} as const;

type TimestampsWithoutMerged = Omit<typeof Timestamps, "MERGED">;

type TimestampsWithoutMergedKey = TimestampsWithoutMerged[keyof TimestampsWithoutMerged];

function buildQuery(owner: string, repository: string, issueID: string) {
	return `
		{
			repository(owner: "${owner}", name: "${repository}") {
				issueOrPullRequest(number: ${issueID}) {
					... on PullRequest {
						commits(last: 1) {
							nodes {
								commit {
									abbreviatedOid
								}
							}
						}
						author {
							login
							url
						}
						merged
						headRef {
							name
						}
						repository {
							nameWithOwner
						}
						headRepository {
							nameWithOwner
						}
						mergedAt
						isDraft
						number
						publishedAt
						title
						url
						closed
						closedAt
						reviewDecision
					}
					... on Issue {
						author {
							login
							url
						}
						repository {
							nameWithOwner
						}
						number
						publishedAt
						title
						url
						closed
						closedAt
					}
				}
			}
		}`;
}

export async function issueInfo(owner: string, repository: string, expression: string) {
	try {
		const query = buildQuery(owner, repository, expression);

		const res = (await fetch(GITHUB_BASE_URL, {
			method: "POST",
			headers: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				Authorization: `Bearer ${GITHUB_TOKEN}`,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				"User-Agent": "CF Worker",
			},
			body: JSON.stringify({ query }),
		}).then(async (res) => res.json())) as unknown as GitHubAPIResult;

		if (!res.data) {
			return `GitHub fetching unsuccessful.\nArguments: \`owner: ${owner}\`, \`repository: ${repository}\`, \`expression: ${expression}\``;
		}

		const issue = res.data.repository?.issueOrPullRequest;
		if (res.errors?.some((e) => e.type === "NOT_FOUND") || !issue) {
			return `Could not find issue or PR \`#${expression}\` on the repository \`${owner}/${repository}\`.`;
		}

		const resultState = isPR(issue)
			? issue.merged
				? ResultStatePR.MERGED
				: issue.isDraft
				? ResultStatePR.DRAFT
				: issue.closed
				? ResultStatePR.CLOSED
				: ResultStatePR.OPEN
			: issue.closed
			? ResultStateIssue.CLOSED
			: ResultStateIssue.OPEN;

		const emoji = isPR(issue)
			? resultState === ResultStatePR["OPEN"]
				? GITHUB_EMOJI_PR_OPEN
				: resultState === ResultStatePR["CLOSED"]
				? GITHUB_EMOJI_PR_CLOSED
				: resultState === ResultStatePR["MERGED"]
				? GITHUB_EMOJI_PR_MERGED
				: GITHUB_EMOJI_PR_DRAFT
			: resultState === ResultStateIssue["OPEN"]
			? GITHUB_EMOJI_ISSUE_OPEN
			: GITHUB_EMOJI_ISSUE_CLOSED;

		const timestampProperty = Timestamps[resultState];
		const timestampState = isPR(issue)
			? resultState === ResultStatePR["OPEN"]
				? "opened"
				: resultState === ResultStatePR["CLOSED"]
				? "closed"
				: resultState === ResultStatePR["MERGED"]
				? "merged"
				: "created"
			: resultState === ResultStateIssue["OPEN"]
			? "opened"
			: "closed";

		const relevantTime = new Date(
			isPR(issue) ? issue[timestampProperty]! : issue[timestampProperty as TimestampsWithoutMergedKey]!,
		).getTime();

		const decision =
			isPR(issue) && !issue.merged && !issue.closed
				? issue.reviewDecision === GitHubReviewDecision["CHANGES_REQUESTED"]
					? "**(changes requested)**"
					: issue.reviewDecision === GitHubReviewDecision["APPROVED"]
					? "**(approved)**"
					: "**(review required)**"
				: "";

		// eslint-disable-next-line unicorn/numeric-separators-style
		const parts = [
			`${emoji} [#${issue.number} in ${issue.repository.nameWithOwner}](<${issue.url}>) by [${issue.author.login}](<${
				issue.author.url
			}>) ${timestampState} <t:${Math.floor(relevantTime / 1_000)}:R> ${isPR(issue) ? decision : ""}`,
			`${issue.title}`,
		];

		return parts.join("\n");
		// eslint-disable-next-line unicorn/prefer-optional-catch-binding
	} catch (error) {
		return "Unable to fetch Github information, try again later!";
	}
}
